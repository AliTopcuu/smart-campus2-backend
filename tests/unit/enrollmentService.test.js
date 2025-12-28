const enrollmentService = require('../../src/services/enrollmentService');
const db = require('../../src/models');
const { User, Course, CourseSection, Student, Enrollment, CoursePrerequisite, Department, AttendanceSession, AttendanceRecord } = db;
const { Op } = require('sequelize');

describe('EnrollmentService', () => {
    let studentUser;
    let student;
    let instructorUser;
    let course1;
    let course2;
    let section1;
    let section2;
    let testDepartment;

    beforeAll(async () => {
        // Create Department only once
        [testDepartment] = await Department.findOrCreate({
            where: { code: 'ENR_TEST_DEPT' },
            defaults: {
                name: 'Enrollment Test Department',
                code: 'ENR_TEST_DEPT',
                faculty: 'Engineering'
            }
        });
    });

    beforeEach(async () => {
        await Enrollment.destroy({ where: {} });

        // Create Instructor
        instructorUser = await User.create({
            fullName: 'Enrollment Instructor',
            email: `instructor_enr_${Date.now()}_${Math.random()}@test.com`,
            passwordHash: 'hash',
            role: 'faculty',
            status: 'active'
        });

        // Create Student
        studentUser = await User.create({
            fullName: 'Enrollment Student',
            email: `student_enr_${Date.now()}_${Math.random()}@test.com`,
            passwordHash: 'hash',
            role: 'student',
            status: 'active'
        });

        student = await Student.create({
            userId: studentUser.id,
            studentNumber: `S_ENR_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            departmentId: testDepartment.id
        });

        // Create Courses
        course1 = await Course.create({
            code: `CSE101_ENR_${Date.now()}_1`,
            name: 'Intro to CS',
            credits: 3,
            ects: 5,
            departmentId: testDepartment.id
        });

        course2 = await Course.create({
            code: `CSE102_ENR_${Date.now()}_2`,
            name: 'Advanced CS',
            credits: 3,
            ects: 5,
            departmentId: testDepartment.id
        });

        // Create Sections
        section1 = await CourseSection.create({
            courseId: course1.id,
            sectionNumber: 1,
            instructorId: instructorUser.id,
            semester: 'Fall 2024',
            year: 2024,
            capacity: 50,
            scheduleJson: {
                days: ['Monday'],
                startTime: '10:00',
                endTime: '12:00'
            }
        });

        section2 = await CourseSection.create({
            courseId: course2.id,
            sectionNumber: 1,
            instructorId: instructorUser.id,
            semester: 'Fall 2024',
            year: 2024,
            capacity: 50,
            scheduleJson: {
                days: ['Tuesday'],
                startTime: '10:00',
                endTime: '12:00'
            }
        });
    });

    describe('enroll', () => {
        it('should enroll student successfully in a course', async () => {
            const result = await enrollmentService.enroll(studentUser.id, section1.id);
            expect(result).toBeDefined();
            expect(result.message).toContain('submitted');

            const enrollment = await Enrollment.findOne({
                where: { studentId: studentUser.id, sectionId: section1.id }
            });
            expect(enrollment).toBeDefined();
            expect(enrollment.status).toBe('pending');
        });

        it('should throw error if already enrolled', async () => {
            await enrollmentService.enroll(studentUser.id, section1.id);

            // Approve it to make it 'enrolled'
            await Enrollment.update(
                { status: 'enrolled' },
                { where: { studentId: studentUser.id, sectionId: section1.id } }
            );

            await expect(enrollmentService.enroll(studentUser.id, section1.id))
                .rejects.toThrow('Already enrolled');
        });

        it('should throw error if prerequisites are not met', async () => {
            // Set course1 as prerequisite for course2
            await CoursePrerequisite.create({
                courseId: course2.id,
                prerequisiteCourseId: course1.id
            });

            await expect(enrollmentService.enroll(studentUser.id, section2.id))
                .rejects.toThrow('Ön koşul dersi tamamlanmamış');
        });

        it('should enroll if prerequisites are met', async () => {
            // Set course1 as prerequisite for course2
            await CoursePrerequisite.create({
                courseId: course2.id,
                prerequisiteCourseId: course1.id
            });

            // Complete course1
            await Enrollment.create({
                studentId: studentUser.id,
                sectionId: section1.id,
                status: 'completed',
                letterGrade: 'A',
                enrollmentDate: new Date()
            });

            const result = await enrollmentService.enroll(studentUser.id, section2.id);
            expect(result).toBeDefined();
        });

        it('should throw error if there is a schedule conflict', async () => {
            // Create a section3 that conflicts with section1
            const section3 = await CourseSection.create({
                courseId: course2.id,
                sectionNumber: 2,
                instructorId: instructorUser.id,
                semester: 'Fall 2024',
                year: 2024,
                capacity: 50,
                scheduleJson: {
                    days: ['Monday'],
                    startTime: '11:00', // Overlaps with 10:00-12:00
                    endTime: '13:00'
                }
            });

            // Enroll in section1
            await enrollmentService.enroll(studentUser.id, section1.id);
            // Approve it
            await Enrollment.update(
                { status: 'enrolled' },
                { where: { studentId: studentUser.id, sectionId: section1.id } }
            );

            await expect(enrollmentService.enroll(studentUser.id, section3.id))
                .rejects.toThrow('çakışıyor');
        });
    });

    describe('myCourses', () => {
        it('should return list of enrolled courses', async () => {
            await Enrollment.create({
                studentId: studentUser.id,
                sectionId: section1.id,
                status: 'enrolled',
                enrollmentDate: new Date()
            });

            const courses = await enrollmentService.myCourses(studentUser.id);
            expect(courses).toBeDefined();
            expect(Array.isArray(courses)).toBe(true);
            expect(courses.length).toBeGreaterThan(0);
            expect(courses[0].sectionId).toBe(section1.id);
        });

        it('should include attendance percentage', async () => {
            await Enrollment.create({
                studentId: studentUser.id,
                sectionId: section1.id,
                status: 'enrolled',
                enrollmentDate: new Date()
            });

            // Create sessions and attendance
            const session = await AttendanceSession.create({
                sectionId: section1.id,
                instructorId: instructorUser.id,
                date: new Date().toISOString().split('T')[0],
                startTime: '10:00',
                endTime: '12:00',
                status: 'ended',
                latitude: 41.0082,
                longitude: 28.9784,
                geofenceRadius: 100
            });

            await AttendanceRecord.create({
                studentId: studentUser.id, // User PK
                sessionId: session.id,
                checkInTime: new Date(),
                status: 'present'
            });

            const courses = await enrollmentService.myCourses(studentUser.id);
            expect(courses[0].attendancePercentage).toBeDefined();
            // Since we added 1 session and 1 record, it might be 100% or close.
        });
    });
});
