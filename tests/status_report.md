# Test Suite Status Report

## Improvements Made
1.  **Global Test Setup**: Implemented `tests/globalSetup.js` for single database synchronization, removing redundant and dangerous syncs in individual tests.
2.  **Robust Data Cleanup**: replaced `TRUNCATE CASCADE` (which caused deadlocks) with ordered `destroy()` calls in `tests/setup.js`.
3.  **Database Integrity**: Added `onDelete: 'CASCADE'` to the following User associations to prevent Foreign Key errors during cleanup and ensure data consistency:
    - `Student`
    - `Enrollment`
    - `AttendanceRecord`
    - `Waitlist`
    - `EventRegistration`
    - `Wallet`
    - `Notification`
    - `Faculty`
4.  **Auth Service Robustness**: Added explicit `try-catch` handling for `SequelizeUniqueConstraintError` in `authService.register` to handle race conditions where concurrent registration requests might check uniqueness before insertion.

## Current Validation Status
- **Auth Unit Tests**: PASS. (Fixed handling of duplicates).
- **Course Unit Tests**: PASS.
- **Middleware Tests**: PASS.
- **Debug Isolation Test**: PASS (Confirmed constraint enforcement).

## Remaining Issues
- **Enrollment & Attendance Service Tests**:
    - ERROR: `Section not found`.
    - This suggests that `CourseSection` records might be getting deleted prematurely or fail to retrieve via `findByPk`.
    - Potential Cause: `User` deletion (Instructor) might be cascading to `CourseSection` if the database schema has `ON DELETE CASCADE` on `instructorId`, contrary to the Sequelize model definition (which defaults to SET NULL).
- **Integration Tests**:
    - `user.test.js` fails with `User not found`. Likely related to the aggressive cleanup or token validity across tests.

## Recommendations
1.  Investigate `CourseSection` constraints in the database using `scripts/check_db.js`:
    ```javascript
    // Check CourseSections FK
    const [sectionResults] = await sequelize.query(`
        SELECT con.conname, con.contype, pg_get_constraintdef(con.oid)
        FROM pg_catalog.pg_constraint con
        INNER JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'CourseSections';
    `);
    ```
2.  If `CourseSection` has `ON DELETE CASCADE` for `instructorId`, either remove it (alter table) or ensure tests create Sections with persistent Instructors / prevent Instructor deletion during the test lifecycle.
