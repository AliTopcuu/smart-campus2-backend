const courseService = require('../../src/services/courseService');
const db = require('../../src/models');
const { Course, Department } = db;

describe('CourseService', () => {
    let testDepartment;

    beforeAll(async () => {
        [testDepartment] = await Department.findOrCreate({
            where: { code: 'CS_TEST_CRS' },
            defaults: {
                name: 'Computer Science Course Test',
                code: 'CS_TEST_CRS',
                faculty: 'Faculty of Science'
            }
        });
    });

    describe('create', () => {
        it('should create a course successfully', async () => {
            const courseData = {
                code: `CS101_${Date.now()}`,
                name: 'Intro to Programming',
                description: 'Basic assignments',
                credits: 3,
                ects: 5,
                departmentId: testDepartment.id,
                syllabusUrl: 'http://example.com/syllabus'
            };

            const result = await courseService.create(courseData);

            expect(result.message).toBe('Course created successfully');
            expect(result.course).toBeDefined();
            expect(result.course.departmentId).toBe(testDepartment.id);

            const dbCourse = await Course.findByPk(result.course.id);
            expect(dbCourse).not.toBeNull();
        });
    });

    describe('list', () => {
        it('should list courses with filters', async () => {
            // Create some courses
            const code1 = `CS101_L_${Date.now()}`;
            await Course.create({
                code: code1,
                name: 'Algorithms',
                credits: 3,
                ects: 5,
                departmentId: testDepartment.id
            });
            await Course.create({
                code: `MATH101_${Date.now()}`,
                name: 'Calculus',
                credits: 4,
                ects: 6,
                departmentId: testDepartment.id
            });

            const courses = await courseService.list({ search: 'Alg' });
            const found = courses.find(c => c.name === 'Algorithms' && c.code === code1);
            expect(found).toBeDefined();
        });

        it('should list all courses if no filter', async () => {
            await Course.create({
                code: `CS102_${Date.now()}`,
                name: 'Data Structures',
                credits: 3,
                ects: 5,
                departmentId: testDepartment.id
            });

            const courses = await courseService.list();
            expect(courses.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('getById', () => {
        it('should return course with details', async () => {
            const course = await Course.create({
                code: `CS202_${Date.now()}`,
                name: 'Operating Systems',
                credits: 3,
                ects: 5,
                departmentId: testDepartment.id
            });

            const result = await courseService.getById(course.id);
            expect(result.code).toBe(course.code);
            expect(result.department).toBeDefined();
        });

        it('should throw error if course not found', async () => {
            await expect(courseService.getById(999999)).rejects.toThrow('Course not found');
        });
    });

    describe('update', () => {
        it('should update course details', async () => {
            const course = await Course.create({
                code: `CS301_${Date.now()}`,
                name: 'Database',
                credits: 3,
                ects: 5,
                departmentId: testDepartment.id
            });

            const updateData = {
                name: 'Database Systems'
            };

            const result = await courseService.update(course.id, updateData);
            expect(result.course.name).toBe('Database Systems');

            const updatedCourse = await Course.findByPk(course.id);
            expect(updatedCourse.name).toBe('Database Systems');
        });
    });

    describe('remove', () => {
        it('should delete a course', async () => {
            const course = await Course.create({
                code: `CS401_${Date.now()}`,
                name: 'AI',
                credits: 3,
                ects: 5,
                departmentId: testDepartment.id
            });

            await courseService.remove(course.id);

            const deletedCourse = await Course.findByPk(course.id);
            expect(deletedCourse).toBeNull();
        });
    });
});
