const attendanceService = require('../../src/services/attendanceService');
const db = require('../../src/models');
const { User, Course, CourseSection, Student, AttendanceSession, AttendanceRecord, Department } = db;
const { ValidationError, ForbiddenError } = require('../../src/utils/errors');
const { Op } = require('sequelize');

describe('AttendanceService', () => {
    let instructorUser;
    let studentUser;
    let course;
    let section;
    let testDepartment;

    beforeAll(async () => {
        // Create Department only once if it persists across tests
        [testDepartment] = await Department.findOrCreate({
            where: { code: 'CENG_ATT' },
            defaults: {
                name: 'Computer Engineering Attendance',
                code: 'CENG_ATT',
                faculty: 'Engineering'
            }
        });
    });

    beforeEach(async () => {
        // Create Instructor
        instructorUser = await User.create({
            fullName: 'Instructor John',
            email: `instructor_${Date.now()}_${Math.random()}@test.com`,
            passwordHash: 'hash',
            role: 'faculty',
            status: 'active'
        });

        // Create Student
        studentUser = await User.create({
            fullName: 'Student Jane',
            email: `student_${Date.now()}_${Math.random()}@test.com`,
            passwordHash: 'hash',
            role: 'student',
            status: 'active'
        });

        await Student.create({
            userId: studentUser.id,
            studentNumber: `S${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            departmentId: testDepartment.id
        });

        // Create Course
        course = await Course.create({
            code: `CSE101_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            name: 'Intro to CS',
            credits: 3,
            ects: 5,
            departmentId: testDepartment.id
        });

        // Create Section
        section = await CourseSection.create({
            courseId: course.id,
            sectionNumber: 1,
            instructorId: instructorUser.id,
            semester: 'Fall 2024',
            year: 2024,
            capacity: 50
        });
    });

    describe('createSession', () => {
        it('should create a new session successfully', async () => {
            const sessionData = {
                sectionId: section.id,
                latitude: 41.0082,
                longitude: 28.9784,
                geofenceRadius: 50,
                date: new Date().toISOString().split('T')[0],
                startTime: '10:00',
                endTime: '12:00'
            };

            const session = await attendanceService.createSession(instructorUser.id, sessionData);

            expect(session).toBeDefined();
            expect(session.qrCode).toBeDefined();
            expect(session.status).toBe('active');

            const dbSession = await AttendanceSession.findByPk(session.id);
            expect(dbSession).toBeDefined();
        });

        it('should throw ForbiddenError if user is not the instructor of the section', async () => {
            const otherInstructor = await User.create({
                fullName: 'Other Instructor',
                email: `other_${Date.now()}_${Math.random()}@test.com`,
                role: 'faculty',
                passwordHash: 'hash',
                status: 'active'
            });

            const sessionData = {
                sectionId: section.id,
                latitude: 41.0082,
                longitude: 28.9784
            };

            await expect(attendanceService.createSession(otherInstructor.id, sessionData))
                .rejects.toThrow(ForbiddenError);
        });
    });

    describe('checkIn', () => {
        let session;
        beforeEach(async () => {
            // Create an active session
            session = await AttendanceSession.create({
                sectionId: section.id,
                instructorId: instructorUser.id,
                date: new Date().toISOString().split('T')[0],
                startTime: '00:00', // All day
                endTime: '23:59',
                latitude: 41.0082,
                longitude: 28.9784,
                geofenceRadius: 100,
                qrCode: `TESTQR_${Date.now()}`,
                status: 'active'
            });
        });

        it('should allow student to check in within geofence', async () => {
            const checkInData = {
                lat: 41.0082, // Same location
                lng: 28.9784
            };

            const result = await attendanceService.checkIn(session.id, studentUser.id, checkInData);
            expect(result).toBeDefined();
            expect(result.isWithinGeofence).toBe(true);

            const record = await AttendanceRecord.findOne({
                where: { sessionId: session.id, studentId: studentUser.id }
            });
            expect(record).toBeDefined();
        });

        it('should flag student if outside geofence', async () => {
            const checkInData = {
                lat: 41.1000, // Far away
                lng: 28.9784
            };

            // Depending on implementation it might throw or just flag.
            // attendanceService.checkIn throws ValidationError if outside geofence

            await expect(attendanceService.checkIn(session.id, studentUser.id, checkInData))
                .rejects.toThrow(ValidationError);
        });

        it('should prevent double check-in', async () => {
            const checkInData = {
                lat: 41.0082,
                lng: 28.9784
            };
            await attendanceService.checkIn(session.id, studentUser.id, checkInData);

            await expect(attendanceService.checkIn(session.id, studentUser.id, checkInData))
                .rejects.toThrow('Bu oturuma zaten katıldınız');
        });
    });
});
