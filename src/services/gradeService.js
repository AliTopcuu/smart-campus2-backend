const db = require('../models');
const { Enrollment, CourseSection, Course, User } = db;
const { Op } = db.Sequelize;

// Calculate letter grade from numeric grade
const calculateLetterGrade = (midterm, final) => {
  if (midterm === null || final === null) {
    return null;
  }

  const total = (midterm * 0.4) + (final * 0.6);
  
  if (total >= 90) return 'A';
  if (total >= 85) return 'A-';
  if (total >= 80) return 'B+';
  if (total >= 75) return 'B';
  if (total >= 70) return 'B-';
  if (total >= 65) return 'C+';
  if (total >= 60) return 'C';
  if (total >= 55) return 'C-';
  if (total >= 50) return 'D+';
  if (total >= 45) return 'D';
  return 'F';
};

// Calculate grade point from letter grade
const calculateGradePoint = (letterGrade) => {
  if (!letterGrade) return null;
  
  // Trim and normalize the letter grade
  const normalizedGrade = String(letterGrade).trim().toUpperCase();
  
  const gradePoints = {
    'A': 4.0,
    'A-': 3.7,
    'B+': 3.3,
    'B': 3.0,
    'B-': 2.7,
    'C+': 2.3,
    'C': 2.0,
    'C-': 1.7,
    'D+': 1.3,
    'D': 1.0,
    'F': 0.0
  };
  
  const result = gradePoints[normalizedGrade];
  console.log('calculateGradePoint:', { 
    originalLetterGrade: letterGrade, 
    normalizedGrade,
    result 
  });
  return result !== undefined ? result : null;
};

const myGrades = async (studentId, filters = {}) => {
  const { year, semester } = filters;
  
  // Build where clause for section filtering (ONLY for filtered grades display, NOT for CGPA)
  const sectionWhere = {};
  if (year !== undefined && year !== null && year !== '') {
    sectionWhere.year = year;
  }
  if (semester !== undefined && semester !== null && semester !== '') {
    sectionWhere.semester = semester;
  }
  
  console.log('myGrades called with filters:', { studentId, filters, sectionWhere });
  
  const enrollments = await Enrollment.findAll({
    where: {
      studentId,
      status: { [Op.in]: ['enrolled', 'completed', 'failed'] }
    },
    include: [
      {
        model: CourseSection,
        as: 'section',
        where: Object.keys(sectionWhere).length > 0 ? sectionWhere : undefined,
        required: true,
        include: [
          {
            model: Course,
            as: 'course',
            attributes: ['id', 'code', 'name', 'credits', 'ects']
          }
        ]
      }
    ],
    order: [['enrollmentDate', 'DESC']]
  });

  const grades = enrollments.map((enrollment) => {
    // If gradePoint is null but letterGrade exists, calculate it
    let gradePoint = enrollment.gradePoint;
    
    // Convert to number if it's a string
    if (typeof gradePoint === 'string') {
      gradePoint = parseFloat(gradePoint);
      if (isNaN(gradePoint)) {
        gradePoint = null;
      }
    }
    
    if ((gradePoint === null || gradePoint === undefined) && enrollment.letterGrade) {
      gradePoint = calculateGradePoint(enrollment.letterGrade);
      console.log('Calculated gradePoint for enrollment:', enrollment.id, {
        letterGrade: enrollment.letterGrade,
        letterGradeType: typeof enrollment.letterGrade,
        calculatedGradePoint: gradePoint
      });
    }
    
    // Ensure gradePoint is never null if letterGrade exists
    if ((gradePoint === null || gradePoint === undefined) && enrollment.letterGrade) {
      gradePoint = 0.0; // Default to 0.0 if calculation fails
      console.warn('gradePoint calculation failed, defaulting to 0.0 for enrollment:', enrollment.id);
    }
    
    // Ensure gradePoint is a number
    if (gradePoint !== null && gradePoint !== undefined) {
      gradePoint = parseFloat(gradePoint);
      if (isNaN(gradePoint)) {
        gradePoint = 0.0;
      }
    }
    
    return {
      enrollmentId: enrollment.id,
      courseCode: enrollment.section.course.code,
      courseName: enrollment.section.course.name,
      credits: enrollment.section.course.credits,
      ects: enrollment.section.course.ects,
      midtermGrade: enrollment.midtermGrade,
      finalGrade: enrollment.finalGrade,
      letter: enrollment.letterGrade,
      letterGrade: enrollment.letterGrade,
      gradePoint: gradePoint, // This should now be a number (0.0 for 'F', not null)
      year: enrollment.section.year,
      semester: enrollment.section.semester
    };
  });

  // Calculate GPA (weighted by credits) for current semester
  // Include courses with letterGrade - calculate gradePoint if missing
  const completedGrades = grades.filter(g => {
    // Must have letterGrade and credits (credits can be 0, but should be defined)
    if (!g.letterGrade || g.credits === null || g.credits === undefined) return false;
    // If gradePoint is still null or undefined, calculate it now
    if (g.gradePoint === null || g.gradePoint === undefined) {
      g.gradePoint = calculateGradePoint(g.letterGrade);
      // If calculation fails, default to 0.0
      if (g.gradePoint === null || g.gradePoint === undefined) {
        g.gradePoint = 0.0;
      }
    }
    // Include courses with gradePoint (even if 0.0)
    return g.gradePoint !== null && g.gradePoint !== undefined;
  });
  
  let gpa = null;
  if (completedGrades.length > 0) {
    const totalPoints = completedGrades.reduce((sum, g) => {
      const points = parseFloat(g.gradePoint || 0);
      const credits = parseFloat(g.credits || 0);
      return sum + (points * credits);
    }, 0);
    const totalCredits = completedGrades.reduce((sum, g) => sum + parseFloat(g.credits || 0), 0);
    gpa = totalCredits > 0 ? totalPoints / totalCredits : null;
    
    console.log('GPA calculation:', {
      completedGradesCount: completedGrades.length,
      completedGrades: completedGrades.map(g => ({
        courseCode: g.courseCode,
        letterGrade: g.letterGrade,
        gradePoint: g.gradePoint,
        credits: g.credits
      })),
      totalPoints,
      totalCredits,
      gpa
    });
  } else {
    console.log('GPA calculation: No completed grades found', {
      gradesCount: grades.length,
      grades: grades.map(g => ({
        courseCode: g.courseCode,
        letterGrade: g.letterGrade,
        gradePoint: g.gradePoint,
        credits: g.credits
      }))
    });
  }

  // CGPA calculation (all completed courses, weighted by credits)
  // CGPA is always calculated from ALL courses, regardless of filters
  // This query explicitly does NOT apply year/semester filters
  // IMPORTANT: Include enrollments with letterGrade regardless of status
  // (some enrollments may still be 'enrolled' but have grades entered)
  const allCompleted = await Enrollment.findAll({
    where: {
      studentId,
      letterGrade: { [Op.ne]: null } // Only requirement: must have a letter grade
      // Note: We don't filter by status here because grades can be entered
      // while enrollment is still 'enrolled' status
    },
    include: [
      {
        model: CourseSection,
        as: 'section',
        required: true, // Only include enrollments with sections
        // No year/semester filters here - we want ALL semesters for CGPA
        include: [
          {
            model: Course,
            as: 'course',
            attributes: ['id', 'code', 'name', 'credits', 'ects']
          }
        ]
      }
    ]
  });
  
  console.log('CGPA query - allCompleted count:', allCompleted.length, {
    studentId,
    filters,
    enrollments: allCompleted.map(e => ({
      id: e.id,
      status: e.status,
      letterGrade: e.letterGrade,
      gradePoint: e.gradePoint,
      sectionYear: e.section?.year,
      sectionSemester: e.section?.semester,
      courseCode: e.section?.course?.code
    }))
  });

  let cgpa = null;
  if (allCompleted.length > 0) {
    const completedWithCredits = allCompleted.filter(e => e.section?.course?.credits && e.letterGrade);
    if (completedWithCredits.length > 0) {
      const totalPoints = completedWithCredits.reduce((sum, e) => {
        // If gradePoint is null, calculate from letterGrade
        let points = parseFloat(e.gradePoint || 0);
        if ((points === 0 || e.gradePoint === null || e.gradePoint === undefined) && e.letterGrade) {
          const calculated = calculateGradePoint(e.letterGrade);
          points = parseFloat(calculated !== null && calculated !== undefined ? calculated : 0);
        }
        const credits = parseFloat(e.section?.course?.credits || 0);
        const contribution = points * credits;
        console.log('CGPA contribution:', {
          enrollmentId: e.id,
          courseCode: e.section?.course?.code,
          year: e.section?.year,
          semester: e.section?.semester,
          letterGrade: e.letterGrade,
          gradePoint: points,
          credits: credits,
          contribution: contribution
        });
        return sum + contribution;
      }, 0);
      const totalCredits = completedWithCredits.reduce((sum, e) => {
        return sum + parseFloat(e.section?.course?.credits || 0);
      }, 0);
      cgpa = totalCredits > 0 ? totalPoints / totalCredits : null;
      
      console.log('CGPA calculation (ALL semesters, ignoring filters):', {
        filtersApplied: filters,
        allCompletedCount: allCompleted.length,
        completedWithCreditsCount: completedWithCredits.length,
        courses: completedWithCredits.map(e => ({
          enrollmentId: e.id,
          courseCode: e.section?.course?.code,
          year: e.section?.year,
          semester: e.section?.semester,
          letterGrade: e.letterGrade,
          gradePoint: parseFloat(e.gradePoint || 0),
          credits: parseFloat(e.section?.course?.credits || 0)
        })),
        totalPoints,
        totalCredits,
        cgpa
      });
    }
  }

  // CGPA should always be calculated from ALL courses, regardless of filters
  // If CGPA is null, it means there are no completed courses across all semesters
  // Do NOT fallback to GPA - CGPA and GPA serve different purposes:
  // - GPA: average for filtered semester/year
  // - CGPA: cumulative average across ALL semesters

  return {
    grades,
    gpa: gpa ? parseFloat(gpa.toFixed(2)) : null,
    cgpa: cgpa ? parseFloat(cgpa.toFixed(2)) : null,
    gpaTrend: null // Can be calculated based on previous semesters
  };
};

const transcript = async (studentId) => {
  try {
    // Include enrollments with letterGrade regardless of status
    // (grades can be entered while enrollment is still 'enrolled')
    const enrollments = await Enrollment.findAll({
      where: {
        studentId,
        letterGrade: { [Op.ne]: null } // Only requirement: must have a letter grade
        // Note: We don't filter by status here because grades can be entered
        // while enrollment is still 'enrolled' status
      },
      include: [
        {
          model: CourseSection,
          as: 'section',
          required: true, // Only include enrollments with sections
          include: [
            {
              model: Course,
              as: 'course',
              required: true, // Only include sections with courses
              attributes: ['id', 'code', 'name', 'credits', 'ects']
            }
          ]
        }
      ],
      raw: false, // Get Sequelize instances
      nest: true // Nest the includes
    });

    // Convert Sequelize instances to plain objects to avoid 'type' property issues
    const plainEnrollments = enrollments.map(enrollment => {
      const plain = enrollment.toJSON ? enrollment.toJSON() : enrollment;
      return plain;
    });

    // Filter and sort in JavaScript
    const filteredAndSorted = plainEnrollments
      .filter(enrollment => enrollment.section && enrollment.section.course) // Filter out any null sections/courses
      .sort((a, b) => {
        // Sort by year DESC, then semester ASC
        const yearA = a.section?.year || 0;
        const yearB = b.section?.year || 0;
        if (yearB !== yearA) {
          return yearB - yearA; // DESC
        }
        // If years are equal, sort by semester
        const semesterA = a.section?.semester || '';
        const semesterB = b.section?.semester || '';
        // Semester order: Fall, Spring, Summer
        const semesterOrder = { 'Fall': 1, 'Spring': 2, 'Summer': 3 };
        const orderA = semesterOrder[semesterA] || 99;
        const orderB = semesterOrder[semesterB] || 99;
        return orderA - orderB; // ASC
      });

    return filteredAndSorted.map((enrollment) => {
        // If gradePoint is null but letterGrade exists, calculate it
        let gradePoint = enrollment.gradePoint;
        
        // Convert to number if it's a string
        if (typeof gradePoint === 'string') {
          gradePoint = parseFloat(gradePoint);
          if (isNaN(gradePoint)) {
            gradePoint = null;
          }
        }
        
        if ((gradePoint === null || gradePoint === undefined) && enrollment.letterGrade) {
          gradePoint = calculateGradePoint(enrollment.letterGrade);
        }
        
        // Ensure gradePoint is never null if letterGrade exists
        if ((gradePoint === null || gradePoint === undefined) && enrollment.letterGrade) {
          gradePoint = 0.0; // Default to 0.0 if calculation fails
        }
        
        // Ensure gradePoint is a number
        if (gradePoint !== null && gradePoint !== undefined) {
          gradePoint = parseFloat(gradePoint);
          if (isNaN(gradePoint)) {
            gradePoint = 0.0;
          }
        }
        
        // Safe access to nested properties
        const section = enrollment.section || {};
        const course = section.course || {};
        
        return {
          courseCode: course.code || 'N/A',
          courseName: course.name || 'N/A',
          credits: course.credits || 0,
          ects: course.ects || 0,
          semester: section.semester || 'N/A',
          year: section.year || null,
          midtermGrade: enrollment.midtermGrade,
          finalGrade: enrollment.finalGrade,
          letterGrade: enrollment.letterGrade,
          gradePoint: gradePoint // This should now be a number
        };
      });
  } catch (error) {
    console.error('Error in transcript service:', error);
    throw error;
  }
};

const transcriptPdf = async (studentId) => {
  // For now, return JSON. PDF generation can be added later with PDFKit or Puppeteer
  const transcriptData = await transcript(studentId);
  const { cgpa } = await myGrades(studentId);

  // This would generate PDF, but for now we'll return a simple text representation
  // In production, use PDFKit or Puppeteer to generate actual PDF
  return {
    transcript: transcriptData,
    cgpa,
    message: 'PDF generation not implemented yet. Use transcript JSON endpoint.'
  };
};

const saveGrades = async (sectionId, instructorId, gradesData) => {
  // Hoca yetkisi kontrolü
  const section = await CourseSection.findByPk(sectionId);
  if (!section) {
    throw new Error('Section not found');
  }

  if (section.instructorId !== instructorId) {
    throw new Error('You are not authorized to enter grades for this section');
  }

  const { grades } = gradesData;

  for (const gradeData of grades) {
    const enrollment = await Enrollment.findByPk(gradeData.enrollmentId);
    
    // Güvenlik kontrolü: Öğrenci bu bölüme mi ait?
    if (!enrollment || enrollment.sectionId !== parseInt(sectionId)) {
      continue;
    }

    const midtermGrade = gradeData.midtermGrade !== undefined ? parseFloat(gradeData.midtermGrade) : enrollment.midtermGrade;
    const finalGrade = gradeData.finalGrade !== undefined ? parseFloat(gradeData.finalGrade) : enrollment.finalGrade;

    // Harf notu hesapla
    const letterGrade = calculateLetterGrade(midtermGrade, finalGrade);
    const calculatedGradePoint = letterGrade ? calculateGradePoint(letterGrade) : null;
    // Ensure gradePoint is a number, not a string
    const gradePoint = calculatedGradePoint !== null && calculatedGradePoint !== undefined 
      ? parseFloat(calculatedGradePoint) 
      : null;

    // Status'ü harf notuna göre güncelle
    // Eğer harf notu girildiyse (hem midterm hem final girilmişse):
    // - F ise -> 'failed'
    // - F değilse (geçti) -> 'completed'
    let newStatus = enrollment.status; // Varsayılan olarak mevcut status'ü koru
    
    if (letterGrade) {
      // Harf notu girildi, status'ü güncelle
      if (letterGrade.trim().toUpperCase() === 'F') {
        newStatus = 'failed';
      } else {
        newStatus = 'completed'; // F değilse geçti
      }
    }

    await enrollment.update({
      midtermGrade,
      finalGrade,
      letterGrade,
      gradePoint,
      status: newStatus // Status'ü harf notuna göre güncelle
    });
  }

  return {
    message: 'Grades saved successfully'
  };
};

module.exports = {
  myGrades,
  transcript,
  transcriptPdf,
  saveGrades
};
