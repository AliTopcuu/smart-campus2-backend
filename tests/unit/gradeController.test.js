const gradeController = require('../../src/controllers/gradeController');
const gradeService = require('../../src/services/gradeService');

// Mock the gradeService
jest.mock('../../src/services/gradeService');

describe('GradeController', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();

        // Mock request object
        mockReq = {
            user: { id: 1 },
            query: {},
            body: {}
        };

        // Mock response object
        mockRes = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        // Mock next function
        mockNext = jest.fn();
    });

    describe('myGrades', () => {
        it('should return grades for student', async () => {
            const mockGrades = {
                grades: [
                    { courseCode: 'CS101', letterGrade: 'A', gradePoint: 4.0 }
                ],
                gpa: 4.0,
                cgpa: 3.8
            };

            gradeService.myGrades.mockResolvedValue(mockGrades);

            await gradeController.myGrades(mockReq, mockRes, mockNext);

            expect(gradeService.myGrades).toHaveBeenCalledWith(1, {});
            expect(mockRes.json).toHaveBeenCalledWith(mockGrades);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should pass filters to service', async () => {
            mockReq.query = { year: '2024', semester: 'Fall' };

            const mockGrades = {
                grades: [],
                gpa: null,
                cgpa: null
            };

            gradeService.myGrades.mockResolvedValue(mockGrades);

            await gradeController.myGrades(mockReq, mockRes, mockNext);

            expect(gradeService.myGrades).toHaveBeenCalledWith(1, {
                year: '2024',
                semester: 'Fall'
            });
            expect(mockRes.json).toHaveBeenCalledWith(mockGrades);
        });

        it('should handle empty filters', async () => {
            mockReq.query = { year: '', semester: null };

            const mockGrades = {
                grades: [],
                gpa: null,
                cgpa: null
            };

            gradeService.myGrades.mockResolvedValue(mockGrades);

            await gradeController.myGrades(mockReq, mockRes, mockNext);

            expect(gradeService.myGrades).toHaveBeenCalledWith(1, {});
        });

        it('should handle errors', async () => {
            const error = new Error('Database error');
            gradeService.myGrades.mockRejectedValue(error);

            await gradeController.myGrades(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
            expect(mockRes.json).not.toHaveBeenCalled();
        });
    });

    describe('transcript', () => {
        it('should return transcript data', async () => {
            const mockTranscript = [
                { courseCode: 'CS101', letterGrade: 'A', year: 2024 },
                { courseCode: 'CS102', letterGrade: 'B+', year: 2024 }
            ];

            gradeService.transcript.mockResolvedValue(mockTranscript);

            await gradeController.transcript(mockReq, mockRes, mockNext);

            expect(gradeService.transcript).toHaveBeenCalledWith(1);
            expect(mockRes.json).toHaveBeenCalledWith(mockTranscript);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should handle errors', async () => {
            const error = new Error('Student not found');
            gradeService.transcript.mockRejectedValue(error);

            await gradeController.transcript(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
            expect(mockRes.json).not.toHaveBeenCalled();
        });
    });

    describe('transcriptPdf', () => {
        it('should return transcript PDF data', async () => {
            const mockPdfData = {
                transcript: [],
                cgpa: 3.5,
                message: 'PDF generation not implemented yet'
            };

            gradeService.transcriptPdf.mockResolvedValue(mockPdfData);

            await gradeController.transcriptPdf(mockReq, mockRes, mockNext);

            expect(gradeService.transcriptPdf).toHaveBeenCalledWith(1);
            expect(mockRes.json).toHaveBeenCalledWith(mockPdfData);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should handle errors', async () => {
            const error = new Error('PDF generation failed');
            gradeService.transcriptPdf.mockRejectedValue(error);

            await gradeController.transcriptPdf(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
            expect(mockRes.json).not.toHaveBeenCalled();
        });
    });

    describe('saveGrades', () => {
        it('should save grades successfully', async () => {
            mockReq.body = {
                sectionId: 10,
                grades: [
                    { enrollmentId: 1, midtermGrade: 85, finalGrade: 90 },
                    { enrollmentId: 2, midtermGrade: 75, finalGrade: 80 }
                ]
            };

            const mockResult = {
                message: 'Grades saved successfully'
            };

            gradeService.saveGrades.mockResolvedValue(mockResult);

            await gradeController.saveGrades(mockReq, mockRes, mockNext);

            expect(gradeService.saveGrades).toHaveBeenCalledWith(
                10,
                1,
                {
                    grades: [
                        { enrollmentId: 1, midtermGrade: 85, finalGrade: 90 },
                        { enrollmentId: 2, midtermGrade: 75, finalGrade: 80 }
                    ]
                }
            );
            expect(mockRes.json).toHaveBeenCalledWith(mockResult);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should handle authorization errors', async () => {
            mockReq.body = {
                sectionId: 10,
                grades: [{ enrollmentId: 1, finalGrade: 90 }]
            };

            const error = new Error('You are not authorized to enter grades for this section');
            gradeService.saveGrades.mockRejectedValue(error);

            await gradeController.saveGrades(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
            expect(mockRes.json).not.toHaveBeenCalled();
        });

        it('should handle section not found errors', async () => {
            mockReq.body = {
                sectionId: 999,
                grades: []
            };

            const error = new Error('Section not found');
            gradeService.saveGrades.mockRejectedValue(error);

            await gradeController.saveGrades(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
            expect(mockRes.json).not.toHaveBeenCalled();
        });
    });
});
