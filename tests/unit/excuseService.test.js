const excuseService = require('../../src/services/excuseService');
const db = require('../../src/models');
const { User, Student, Course, CourseSection, AttendanceSession, AttendanceRecord, ExcuseRequest, Department } = db;

describe('ExcuseService', () => {
    let testDepartment;
    let studentUser;
    let student;
    let instructorUser;
    let course;
    let section;
    let attendanceSession;

    beforeAll(async () => {
        [testDepartment] = await Department.findOrCreate({
            where: { code: 'EXCUSE_TEST_DEPT' },
            defaults: {
                name: 'Excuse Test Department',
                code: 'EXCUSE_TEST_DEPT',
                faculty: 'Engineering'
            }
        });
    });

    beforeEach(async () => {
        // Create instructor
        instructorUser = await User.create({
            fullName: 'Excuse Test Instructor',
            email: `excuse_instructor_${Date.now()}_${Math.random()}@test.com`,
            passwordHash: 'hash',
            role: 'faculty',
            status: 'active'
        });

        // Create student
        studentUser = await User.create({
            fullName: 'Excuse Test Student',
            email: `excuse_student_${Date.now()}_${Math.random()}@test.com`,
            passwordHash: 'hash',
            role: 'student',
            status: 'active'
        });

        student = await Student.create({
            userId: studentUser.id,
            studentNumber: `S_EXCUSE_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            departmentId: testDepartment.id
        });

        // Create course
        course = await Course.create({
            code: `CS101_EXCUSE_${Date.now()}`,
            name: 'Test Course',
            credits: 3,
            ects: 5,
            departmentId: testDepartment.id
        });

        // Create section
        section = await CourseSection.create({
            courseId: course.id,
            sectionNumber: 1,
            semester: 'Fall',
            year: 2024,
            instructorId: instructorUser.id,
            capacity: 50
        });

        // Create attendance session
        attendanceSession = await AttendanceSession.create({
            sectionId: section.id,
            instructorId: instructorUser.id,
            date: new Date().toISOString().split('T')[0],
            startTime: '10:00',
            endTime: '12:00',
            status: 'ended',
            latitude: 41.0082,
            longitude: 28.9784,
            geofenceRadius: 100
        });

        // Create attendance record (absent)
        await AttendanceRecord.create({
            studentId: studentUser.id,
            sessionId: attendanceSession.id,
            status: 'absent'
        });
    });

    describe('submitExcuseRequest', () => {
        it('should submit excuse request successfully', async () => {
            const requestData = {
                sectionId: section.id,
                sessionIds: [attendanceSession.id],
                reason: 'Medical emergency',
                description: 'I was sick and could not attend',
                documentUrl: 'http://example.com/medical-report.pdf'
            };

            const result = await excuseService.submitExcuseRequest(studentUser.id, requestData);

            expect(result).toBeDefined();
            expect(result.message).toContain('submitted');
            expect(result.request).toBeDefined();
            expect(result.request.reason).toBe('Medical emergency');
        });

        it('should throw error if no sessions provided', async () => {
            const requestData = {
                sectionId: section.id,
                sessionIds: [],
                reason: 'Medical',
                description: 'Test'
            };

            await expect(
                excuseService.submitExcuseRequest(studentUser.id, requestData)
            ).rejects.toThrow();
        });

        it('should throw error if student not enrolled', async () => {
            const otherStudent = await User.create({
                fullName: 'Other Student',
                email: `other_${Date.now()}@test.com`,
                passwordHash: 'hash',
                role: 'student',
                status: 'active'
            });

            const requestData = {
                sectionId: section.id,
                sessionIds: [attendanceSession.id],
                reason: 'Medical',
                description: 'Test'
            };

            await expect(
                excuseService.submitExcuseRequest(otherStudent.id, requestData)
            ).rejects.toThrow();
        });
    });

    describe('getMyExcuseRequests', () => {
        it('should return student excuse requests', async () => {
            // Create an excuse request
            await ExcuseRequest.create({
                studentId: studentUser.id,
                sectionId: section.id,
                sessionIds: [attendanceSession.id],
                reason: 'Medical',
                description: 'Sick',
                status: 'pending'
            });

            const result = await excuseService.getMyExcuseRequests(studentUser.id);

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
            expect(result[0].reason).toBe('Medical');
        });

        it('should return empty array if no requests', async () => {
            const result = await excuseService.getMyExcuseRequests(studentUser.id);

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(0);
        });
    });

    describe('getExcuseRequestsForInstructor', () => {
        it('should return excuse requests for instructor sections', async () => {
            await ExcuseRequest.create({
                studentId: studentUser.id,
                sectionId: section.id,
                sessionIds: [attendanceSession.id],
                reason: 'Medical',
                description: 'Sick',
                status: 'pending'
            });

            const result = await excuseService.getExcuseRequestsForInstructor(instructorUser.id);

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
        });

        it('should not return requests from other instructors', async () => {
            const otherInstructor = await User.create({
                fullName: 'Other Instructor',
                email: `other_inst_${Date.now()}@test.com`,
                passwordHash: 'hash',
                role: 'faculty',
                status: 'active'
            });

            const result = await excuseService.getExcuseRequestsForInstructor(otherInstructor.id);

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(0);
        });
    });

    describe('approveExcuseRequest', () => {
        it('should approve excuse request', async () => {
            const excuseRequest = await ExcuseRequest.create({
                studentId: studentUser.id,
                sectionId: section.id,
                sessionIds: [attendanceSession.id],
                reason: 'Medical',
                description: 'Sick',
                status: 'pending'
            });

            const result = await excuseService.approveExcuseRequest(
                excuseRequest.id,
                instructorUser.id,
                'Approved - valid medical excuse'
            );

            expect(result).toBeDefined();
            expect(result.message).toContain('approved');

            // Verify status changed
            await excuseRequest.reload();
            expect(excuseRequest.status).toBe('approved');
            expect(excuseRequest.reviewedBy).toBe(instructorUser.id);
        });

        it('should throw error if not instructor of section', async () => {
            const otherInstructor = await User.create({
                fullName: 'Other Instructor',
                email: `other_inst2_${Date.now()}@test.com`,
                passwordHash: 'hash',
                role: 'faculty',
                status: 'active'
            });

            const excuseRequest = await ExcuseRequest.create({
                studentId: studentUser.id,
                sectionId: section.id,
                sessionIds: [attendanceSession.id],
                reason: 'Medical',
                description: 'Sick',
                status: 'pending'
            });

            await expect(
                excuseService.approveExcuseRequest(
                    excuseRequest.id,
                    otherInstructor.id,
                    'Test'
                )
            ).rejects.toThrow();
        });

        it('should throw error if request not found', async () => {
            await expect(
                excuseService.approveExcuseRequest(999999, instructorUser.id, 'Test')
            ).rejects.toThrow();
        });
    });

    describe('rejectExcuseRequest', () => {
        it('should reject excuse request', async () => {
            const excuseRequest = await ExcuseRequest.create({
                studentId: studentUser.id,
                sectionId: section.id,
                sessionIds: [attendanceSession.id],
                reason: 'Medical',
                description: 'Sick',
                status: 'pending'
            });

            const result = await excuseService.rejectExcuseRequest(
                excuseRequest.id,
                instructorUser.id,
                'Not enough documentation'
            );

            expect(result).toBeDefined();
            expect(result.message).toContain('rejected');

            // Verify status changed
            await excuseRequest.reload();
            expect(excuseRequest.status).toBe('rejected');
            expect(excuseRequest.reviewedBy).toBe(instructorUser.id);
        });

        it('should throw error if not instructor of section', async () => {
            const otherInstructor = await User.create({
                fullName: 'Other Instructor 3',
                email: `other_inst3_${Date.now()}@test.com`,
                passwordHash: 'hash',
                role: 'faculty',
                status: 'active'
            });

            const excuseRequest = await ExcuseRequest.create({
                studentId: studentUser.id,
                sectionId: section.id,
                sessionIds: [attendanceSession.id],
                reason: 'Medical',
                description: 'Sick',
                status: 'pending'
            });

            await expect(
                excuseService.rejectExcuseRequest(
                    excuseRequest.id,
                    otherInstructor.id,
                    'Test'
                )
            ).rejects.toThrow();
        });
    });

    describe('getSessionsForExcuseRequest', () => {
        it('should return sessions for student and section', async () => {
            const result = await excuseService.getSessionsForExcuseRequest(
                studentUser.id,
                section.id,
                new Date().toISOString().split('T')[0]
            );

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
        });

        it('should return empty array if no sessions', async () => {
            const result = await excuseService.getSessionsForExcuseRequest(
                studentUser.id,
                section.id,
                '1970-01-01'
            );

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(0);
        });
    });
});
