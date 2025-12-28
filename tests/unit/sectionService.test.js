const { CourseSection, Course, User, Department } = require('../../src/models');
const sectionService = require('../../src/services/sectionService');

describe('SectionService', () => {
    let course;
    let instructor;
    let department;

    beforeEach(async () => {
        // Create dependencies fresh for each test because afterEach cleans the DB
        department = await Department.create({
            name: `CS Dept ${Date.now()}`,
            code: `CSE${Math.floor(Math.random() * 1000)}`,
            faculty: 'Engineering'
        });

        instructor = await User.create({
            fullName: 'Dr. Instructor',
            email: `instructor_${Date.now()}@test.com`,
            passwordHash: 'hash',
            role: 'faculty',
            status: 'active'
        });

        course = await Course.create({
            code: `CSE101_${Date.now()}`,
            name: 'Intro to CS',
            credits: 3,
            ects: 5,
            departmentId: department.id
        });

        // Create a fresh section before each test
        section = await sectionService.create({
            courseId: course.id,
            sectionNumber: 1,
            semester: 'Fall',
            year: 2024,
            instructorId: instructor.id,
            capacity: 50,
            scheduleJson: { days: ['Mon'], startTime: '10:00', endTime: '12:00' }
        });
    });

    describe('create', () => {
        it('should create a section successfully', async () => {
            // Since we already create one in beforeEach, let's create ANOTHER one to test creation logic explicitly
            const newSection = await sectionService.create({
                courseId: course.id,
                sectionNumber: 99,
                semester: 'Spring',
                year: 2025,
                instructorId: instructor.id,
                capacity: 40
            });
            expect(newSection.message).toBe('Section created successfully');
            expect(newSection.section.sectionNumber).toBe(99);
        });
    });

    describe('list', () => {
        it('should list sections with filters', async () => {
            const sections = await sectionService.list({ semester: 'Fall', year: 2024 });
            expect(sections.length).toBeGreaterThan(0);
            expect(sections[0].course).toBeDefined();
        });
    });

    describe('getById', () => {
        it('should return section details', async () => {
            const found = await sectionService.getById(section.section.id);
            expect(found.id).toBe(section.section.id);
            expect(found.course.code).toBe(course.code);
        });

        it('should throw error if not found', async () => {
            await expect(sectionService.getById(99999)).rejects.toThrow('Section not found');
        });
    });

    describe('mySections', () => {
        it('should return sections for specific instructor', async () => {
            const sections = await sectionService.mySections(instructor.id);
            expect(Array.isArray(sections)).toBe(true);
            expect(sections.length).toBeGreaterThan(0);
        });
    });

    describe('update', () => {
        it('should update section successfully', async () => {
            const updated = await sectionService.update(section.section.id, { capacity: 100 });
            expect(updated.section.capacity).toBe(100);
        });
    });
});
