const courseController = require('../../src/controllers/courseController');
const courseService = require('../../src/services/courseService');
const db = require('../../src/models');

// Mock the courseService and models
jest.mock('../../src/services/courseService');
jest.mock('../../src/models');

describe('CourseController', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
        jest.clearAllMocks();

        // Reset db mocks
        db.Classroom = {};
        db.CourseSection = {};
        db.ClassroomReservation = {};

        mockReq = {
            user: { id: 1 },
            query: {},
            body: {},
            params: {}
        };

        mockRes = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        mockNext = jest.fn();
    });

    describe('list', () => {
        it('should list all courses', async () => {
            const mockCourses = [
                { id: 1, code: 'CS101', name: 'Intro to CS' },
                { id: 2, code: 'CS102', name: 'Data Structures' }
            ];

            courseService.list.mockResolvedValue(mockCourses);

            await courseController.list(mockReq, mockRes, mockNext);

            expect(courseService.list).toHaveBeenCalledWith({});
            expect(mockRes.json).toHaveBeenCalledWith(mockCourses);
        });

        it('should handle data wrapper', async () => {
            const mockResponse = {
                data: [{ id: 1, code: 'CS101' }],
                total: 1
            };

            courseService.list.mockResolvedValue(mockResponse);

            await courseController.list(mockReq, mockRes, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith(mockResponse.data);
        });

        it('should handle errors', async () => {
            const error = new Error('Database error');
            courseService.list.mockRejectedValue(error);

            await courseController.list(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getById', () => {
        it('should get course by id', async () => {
            const mockCourse = { id: 1, code: 'CS101', name: 'Intro to CS' };
            mockReq.params.id = '1';

            courseService.getById.mockResolvedValue(mockCourse);

            await courseController.getById(mockReq, mockRes, mockNext);

            expect(courseService.getById).toHaveBeenCalledWith('1');
            expect(mockRes.json).toHaveBeenCalledWith(mockCourse);
        });

        it('should handle not found errors', async () => {
            mockReq.params.id = '999';
            const error = new Error('Course not found');
            courseService.getById.mockRejectedValue(error);

            await courseController.getById(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('create', () => {
        it('should create a course', async () => {
            mockReq.body = {
                code: 'CS101',
                name: 'Intro to CS',
                credits: 3,
                departmentId: 1
            };

            const mockResult = {
                message: 'Course created successfully',
                course: { id: 1, ...mockReq.body }
            };

            courseService.create.mockResolvedValue(mockResult);

            await courseController.create(mockReq, mockRes, mockNext);

            expect(courseService.create).toHaveBeenCalledWith(mockReq.body);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockResult);
        });

        it('should handle validation errors', async () => {
            mockReq.body = { code: 'CS101' }; // Missing required fields
            const error = new Error('Validation error');
            courseService.create.mockRejectedValue(error);

            await courseController.create(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('update', () => {
        it('should update a course', async () => {
            mockReq.params.id = '1';
            mockReq.body = { name: 'Updated Name' };

            const mockResult = {
                message: 'Course updated successfully',
                course: { id: 1, name: 'Updated Name' }
            };

            courseService.update.mockResolvedValue(mockResult);

            await courseController.update(mockReq, mockRes, mockNext);

            expect(courseService.update).toHaveBeenCalledWith('1', mockReq.body);
            expect(mockRes.json).toHaveBeenCalledWith(mockResult);
        });

        it('should handle errors', async () => {
            mockReq.params.id = '999';
            const error = new Error('Course not found');
            courseService.update.mockRejectedValue(error);

            await courseController.update(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('remove', () => {
        it('should delete a course', async () => {
            mockReq.params.id = '1';

            const mockResult = { message: 'Course deleted successfully' };
            courseService.remove.mockResolvedValue(mockResult);

            await courseController.remove(mockReq, mockRes, mockNext);

            expect(courseService.remove).toHaveBeenCalledWith('1');
            expect(mockRes.json).toHaveBeenCalledWith(mockResult);
        });

        it('should handle errors', async () => {
            mockReq.params.id = '1';
            const error = new Error('Cannot delete course');
            courseService.remove.mockRejectedValue(error);

            await courseController.remove(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getClassrooms', () => {
        it('should list all classrooms', async () => {
            const mockClassrooms = [
                { id: 1, building: 'A', roomNumber: '101' },
                { id: 2, building: 'B', roomNumber: '202' }
            ];

            db.Classroom = {
                findAll: jest.fn().mockResolvedValue(mockClassrooms)
            };

            await courseController.getClassrooms(mockReq, mockRes, mockNext);

            expect(db.Classroom.findAll).toHaveBeenCalledWith({
                order: [['building', 'ASC'], ['roomNumber', 'ASC']]
            });
            expect(mockRes.json).toHaveBeenCalledWith(mockClassrooms);
        });

        it('should handle errors', async () => {
            const error = new Error('Database error');
            db.Classroom = {
                findAll: jest.fn().mockRejectedValue(error)
            };

            await courseController.getClassrooms(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('createClassroom', () => {
        it('should create a classroom', async () => {
            mockReq.body = {
                building: 'A',
                roomNumber: '101',
                capacity: 50
            };

            const mockClassroom = { id: 1, ...mockReq.body };

            db.Classroom = {
                findOne: jest.fn().mockResolvedValue(null),
                create: jest.fn().mockResolvedValue(mockClassroom)
            };

            await courseController.createClassroom(mockReq, mockRes, mockNext);

            expect(db.Classroom.create).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockClassroom);
        });

        it('should handle duplicate classroom', async () => {
            mockReq.body = {
                building: 'A',
                roomNumber: '101',
                capacity: 50
            };

            db.Classroom = {
                findOne: jest.fn().mockResolvedValue({ id: 1 })
            };

            await courseController.createClassroom(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockNext.mock.calls[0][0].message).toContain('already exists');
        });

        it('should handle missing required fields', async () => {
            mockReq.body = { building: 'A' }; // Missing roomNumber and capacity

            await courseController.createClassroom(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockNext.mock.calls[0][0].message).toContain('required');
        });
    });

    describe('updateClassroom', () => {
        it('should update a classroom', async () => {
            mockReq.params.id = '1';
            mockReq.body = { capacity: 60 };

            const mockClassroom = {
                id: 1,
                building: 'A',
                roomNumber: '101',
                capacity: 50,
                update: jest.fn().mockResolvedValue(true)
            };

            db.Classroom = {
                findByPk: jest.fn().mockResolvedValue(mockClassroom)
            };

            await courseController.updateClassroom(mockReq, mockRes, mockNext);

            expect(mockClassroom.update).toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith(mockClassroom);
        });

        it('should handle classroom not found', async () => {
            mockReq.params.id = '999';

            db.Classroom = {
                findByPk: jest.fn().mockResolvedValue(null)
            };

            await courseController.updateClassroom(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockNext.mock.calls[0][0].message).toContain('not found');
        });
    });

    describe('deleteClassroom', () => {
        it('should delete a classroom', async () => {
            mockReq.params.id = '1';

            const mockClassroom = {
                id: 1,
                destroy: jest.fn().mockResolvedValue(true)
            };

            db.Classroom = {
                findByPk: jest.fn().mockResolvedValue(mockClassroom)
            };

            db.CourseSection = {
                count: jest.fn().mockResolvedValue(0)
            };

            db.ClassroomReservation = {
                count: jest.fn().mockResolvedValue(0)
            };

            await courseController.deleteClassroom(mockReq, mockRes, mockNext);

            expect(mockClassroom.destroy).toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Classroom deleted successfully'
            });
        });

        it('should prevent deletion if classroom is in use', async () => {
            mockReq.params.id = '1';

            const mockClassroom = { id: 1 };

            db.Classroom = {
                findByPk: jest.fn().mockResolvedValue(mockClassroom)
            };

            db.CourseSection = {
                count: jest.fn().mockResolvedValue(3) // Used in 3 sections
            };

            db.ClassroomReservation = {
                count: jest.fn().mockResolvedValue(0)
            };

            await courseController.deleteClassroom(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockNext.mock.calls[0][0].message).toContain('Cannot delete');
        });

        it('should handle classroom not found', async () => {
            mockReq.params.id = '999';

            db.Classroom = {
                findByPk: jest.fn().mockResolvedValue(null)
            };

            await courseController.deleteClassroom(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockNext.mock.calls[0][0].message).toContain('not found');
        });
    });
});
