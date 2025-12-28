const gradeService = require('../../src/services/gradeService');
const db = require('../../src/models');
const { User, Student, Course, CourseSection, Enrollment, Department } = db;

describe('GradeService', () => {
    let testDepartment;
    let studentUser;
    let student;
    let instructorUser;
    let course1;
    let course2;
    let section1;
    let section2;

    beforeAll(async () => {
        // Create department once
        [testDepartment] = await Department.findOrCreate({
            where: { code: 'GRADE_TEST_DEPT' },
            defaults: {
                name: 'Grade Test Department',
                code: 'GRADE_TEST_DEPT',
                faculty: 'Engineering'
            }
        });
    });

    beforeEach(async () => {
        // Create fresh student for each test
        studentUser = await User.create({
            fullName: 'Grade Test Student',
            email: `grade_student_${Date.now()}_${Math.random()}@test.com`,
            passwordHash: 'hash',
            role: 'student',
            status: 'active'
        });

        student = await Student.create({
            userId: studentUser.id,
            studentNumber: `S_GRADE_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            departmentId: testDepartment.id
        });

        instructorUser = await User.create({
            fullName: 'Grade Test Instructor',
            email: `grade_instructor_${Date.now()}_${Math.random()}@test.com`,
            passwordHash: 'hash',
            role: 'faculty',
            status: 'active'
        });

        // Create courses
        course1 = await Course.create({
            code: `CS101_GRADE_${Date.now()}_1`,
            name: 'Introduction to CS',
            credits: 3,
            ects: 5,
            departmentId: testDepartment.id
        });

        course2 = await Course.create({
            code: `CS102_GRADE_${Date.now()}_2`,
            name: 'Data Structures',
            credits: 4,
            ects: 6,
            departmentId: testDepartment.id
        });

        // Create sections
        section1 = await CourseSection.create({
            courseId: course1.id,
            sectionNumber: 1,
            semester: 'Fall',
            year: 2024,
            instructorId: instructorUser.id,
            capacity: 50
        });

        section2 = await CourseSection.create({
            courseId: course2.id,
            sectionNumber: 1,
            semester: 'Spring',
            year: 2025,
            instructorId: instructorUser.id,
            capacity: 50
        });
    });

    describe('myGrades', () => {
        it('should return grades for student', async () => {
            // Enroll student and add grades
            const enrollment = await Enrollment.create({
                studentId: studentUser.id,
                sectionId: section1.id,
                status: 'completed',
                enrollmentDate: new Date(),
                midtermGrade: 85,
                finalGrade: 90,
                letterGrade: 'A',
                gradePoint: 4.0
            });

            const result = await gradeService.myGrades(studentUser.id);

            expect(result).toBeDefined();
            expect(result.grades).toBeDefined();
            expect(Array.isArray(result.grades)).toBe(true);
            expect(result.grades.length).toBeGreaterThan(0);
            expect(result.gpa).toBeDefined();
            expect(result.cgpa).toBeDefined();
        });

        it('should filter grades by year and semester', async () => {
            // Create enrollments in different semesters
            await Enrollment.create({
                studentId: studentUser.id,
                sectionId: section1.id,
                status: 'completed',
                enrollmentDate: new Date(),
                midtermGrade: 85,
                finalGrade: 90,
                letterGrade: 'A',
                gradePoint: 4.0
            });

            await Enrollment.create({
                studentId: studentUser.id,
                sectionId: section2.id,
                status: 'completed',
                enrollmentDate: new Date(),
                midtermGrade: 75,
                finalGrade: 80,
                letterGrade: 'B+',
                gradePoint: 3.3
            });

            const result = await gradeService.myGrades(studentUser.id, {
                year: 2024,
                semester: 'Fall'
            });

            expect(result.grades.length).toBe(1);
            expect(result.grades[0].year).toBe(2024);
            expect(result.grades[0].semester).toBe('Fall');
        });

        it('should calculate GPA correctly', async () => {
            // Add two courses with known grades
            await Enrollment.create({
                studentId: studentUser.id,
                sectionId: section1.id,
                status: 'completed',
                enrollmentDate: new Date(),
                midtermGrade: 90,
                finalGrade: 90,
                letterGrade: 'A',
                gradePoint: 4.0
            });

            await Enrollment.create({
                studentId: studentUser.id,
                sectionId: section2.id,
                status: 'completed',
                enrollmentDate: new Date(),
                midtermGrade: 80,
                finalGrade: 80,
                letterGrade: 'B+',
                gradePoint: 3.3
            });

            const result = await gradeService.myGrades(studentUser.id);

            // GPA = (4.0 * 3 + 3.3 * 4) / (3 + 4) = (12 + 13.2) / 7 = 3.6
            expect(result.gpa).toBeCloseTo(3.6, 1);
            expect(result.cgpa).toBeCloseTo(3.6, 1);
        });

        it('should return null GPA when no completed courses', async () => {
            const result = await gradeService.myGrades(studentUser.id);

            expect(result.grades.length).toBe(0);
            expect(result.gpa).toBeNull();
            expect(result.cgpa).toBeNull();
        });
    });

    describe('transcript', () => {
        it('should return transcript data', async () => {
            await Enrollment.create({
                studentId: studentUser.id,
                sectionId: section1.id,
                status: 'completed',
                enrollmentDate: new Date(),
                midtermGrade: 85,
                finalGrade: 90,
                letterGrade: 'A',
                gradePoint: 4.0
            });

            const result = await gradeService.transcript(studentUser.id);

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
            expect(result[0]).toHaveProperty('courseCode');
            expect(result[0]).toHaveProperty('courseName');
            expect(result[0]).toHaveProperty('letterGrade');
        });

        it('should sort transcript by year DESC and semester', async () => {
            await Enrollment.create({
                studentId: studentUser.id,
                sectionId: section1.id,
                status: 'completed',
                enrollmentDate: new Date(),
                letterGrade: 'A',
                gradePoint: 4.0
            });

            await Enrollment.create({
                studentId: studentUser.id,
                sectionId: section2.id,
                status: 'completed',
                enrollmentDate: new Date(),
                letterGrade: 'B+',
                gradePoint: 3.3
            });

            const result = await gradeService.transcript(studentUser.id);

            expect(result.length).toBe(2);
            // Latest year first (2025)
            expect(result[0].year).toBe(2025);
            expect(result[1].year).toBe(2024);
        });
    });

    describe('transcriptPdf', () => {
        it('should return transcript data with message', async () => {
            await Enrollment.create({
                studentId: studentUser.id,
                sectionId: section1.id,
                status: 'completed',
                enrollmentDate: new Date(),
                letterGrade: 'A',
                gradePoint: 4.0
            });

            const result = await gradeService.transcriptPdf(studentUser.id);

            expect(result).toBeDefined();
            expect(result.transcript).toBeDefined();
            expect(result.message).toContain('PDF generation not implemented');
        });
    });

    describe('saveGrades', () => {
        it('should save grades for section', async () => {
            const enrollment = await Enrollment.create({
                studentId: studentUser.id,
                sectionId: section1.id,
                status: 'enrolled',
                enrollmentDate: new Date()
            });

            const gradesData = {
                grades: [{
                    enrollmentId: enrollment.id,
                    midtermGrade: 85,
                    finalGrade: 90
                }]
            };

            const result = await gradeService.saveGrades(
                section1.id,
                instructorUser.id,
                gradesData
            );

            expect(result.message).toBe('Grades saved successfully');

            // Verify grades were saved
            await enrollment.reload();
            expect(parseFloat(enrollment.midtermGrade)).toBe(85);
            expect(parseFloat(enrollment.finalGrade)).toBe(90);
            expect(enrollment.letterGrade).toBe('A-'); // (85*0.4 + 90*0.6) = 88 = A-
            expect(parseFloat(enrollment.gradePoint)).toBe(3.7); // A- = 3.7
        });

        it('should throw error if instructor not authorized', async () => {
            const otherInstructor = await User.create({
                fullName: 'Other Instructor',
                email: `other_${Date.now()}@test.com`,
                passwordHash: 'hash',
                role: 'faculty',
                status: 'active'
            });

            const enrollment = await Enrollment.create({
                studentId: studentUser.id,
                sectionId: section1.id,
                status: 'enrolled',
                enrollmentDate: new Date()
            });

            const gradesData = {
                grades: [{
                    enrollmentId: enrollment.id,
                    midtermGrade: 85,
                    finalGrade: 90
                }]
            };

            await expect(
                gradeService.saveGrades(section1.id, otherInstructor.id, gradesData)
            ).rejects.toThrow('not authorized');
        });

        it('should update status to completed when passing grade', async () => {
            const enrollment = await Enrollment.create({
                studentId: studentUser.id,
                sectionId: section1.id,
                status: 'enrolled',
                enrollmentDate: new Date()
            });

            const gradesData = {
                grades: [{
                    enrollmentId: enrollment.id,
                    midtermGrade: 70,
                    finalGrade: 75
                }]
            };

            await gradeService.saveGrades(
                section1.id,
                instructorUser.id,
                gradesData
            );

            await enrollment.reload();
            expect(enrollment.status).toBe('completed');
            expect(enrollment.letterGrade).toBe('B-'); // 70-75 range = B-
        });

        it('should update status to failed when failing grade', async () => {
            const enrollment = await Enrollment.create({
                studentId: studentUser.id,
                sectionId: section1.id,
                status: 'enrolled',
                enrollmentDate: new Date()
            });

            const gradesData = {
                grades: [{
                    enrollmentId: enrollment.id,
                    midtermGrade: 30,
                    finalGrade: 40
                }]
            };

            await gradeService.saveGrades(
                section1.id,
                instructorUser.id,
                gradesData
            );

            await enrollment.reload();
            expect(enrollment.status).toBe('failed');
            expect(enrollment.letterGrade).toBe('F');
            expect(parseFloat(enrollment.gradePoint)).toBe(0.0);
        });

        it('should throw error if section not found', async () => {
            const gradesData = {
                grades: [{
                    enrollmentId: 999,
                    midtermGrade: 85,
                    finalGrade: 90
                }]
            };

            await expect(
                gradeService.saveGrades(999999, instructorUser.id, gradesData)
            ).rejects.toThrow('Section not found');
        });
    });
});
