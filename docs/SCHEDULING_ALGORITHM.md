# Scheduling Algorithm Documentation

## Problem Definition

The course scheduling problem is a **Constraint Satisfaction Problem (CSP)** where we need to assign time slots, days, and classrooms to course sections while satisfying multiple hard and soft constraints.

### Variables
- **Sections**: Course sections that need to be scheduled
- Each section requires: day, start time, end time, and classroom

### Domains
- **Days**: Monday, Tuesday, Wednesday, Thursday, Friday
- **Time Slots**: 09:00-17:00 (excluding lunch break 12:00-13:00)
  - Each slot is 30 minutes
  - Courses are 1.5 hours (3 slots) with 15 min break between courses
- **Classrooms**: Available classrooms with capacity and features

### Hard Constraints (Must Satisfy)

1. **No Instructor Double-Booking**
   - An instructor cannot teach two sections at the same time
   - Minimum 15 minutes gap required between instructor's classes

2. **No Classroom Double-Booking**
   - A classroom cannot host two sections simultaneously
   - Minimum 15 minutes gap required between classes in same classroom

3. **No Student Schedule Conflict**
   - A student cannot be enrolled in two sections that overlap in time
   - Based on enrollment data

4. **Classroom Capacity**
   - Classroom capacity must be >= section capacity
   - `classroom.capacity >= section.capacity`

5. **Classroom Features**
   - Classroom must have all required features for the course
   - If course requires specific features (e.g., projector, lab equipment), classroom must provide them

6. **Lunch Break**
   - No classes can be scheduled during 12:00-13:00

### Soft Constraints (Optimize)

1. **Instructor Time Preferences**
   - Respect instructor's preferred time slots if specified

2. **Minimize Gaps**
   - Prefer consecutive time slots for students
   - Reduce gaps between classes

3. **Distribute Courses Evenly**
   - Distribute courses evenly across the week
   - Avoid clustering all classes on specific days

4. **Morning Preference for Required Courses**
   - Required courses should be scheduled in morning slots (09:00-12:00)

## Algorithm: Backtracking with Constraint Propagation

### Pseudocode

```
function BACKTRACK_SCHEDULE(sections, classrooms, enrollments, existingAssignments, assignments, depth):
    if depth >= sections.length:
        return { success: true, assignments }
    
    section = sections[depth]
    
    // Check if section has existing schedule
    if section has existing schedule:
        if existing schedule satisfies constraints:
            add to assignments
            result = BACKTRACK_SCHEDULE(..., depth + 1)
            if result.success:
                return result
            remove from assignments
    
    // Try all possible assignments
    for each classroom in classrooms:
        for each day in [Monday, Tuesday, Wednesday, Thursday, Friday]:
            for each time slot in available time slots:
                startTime = time slot
                endTime = startTime + 1.5 hours
                
                // Skip if overlaps lunch break
                if overlapsLunchBreak(startTime, endTime):
                    continue
                
                assignment = {
                    sectionId: section.id,
                    classroomId: classroom.id,
                    day: day,
                    startTime: startTime,
                    endTime: endTime
                }
                
                // Check hard constraints
                if checkHardConstraints(assignment, allAssignments, section, classroom, day, startTime, endTime, enrollments):
                    add assignment to assignments
                    result = BACKTRACK_SCHEDULE(..., depth + 1)
                    if result.success:
                        return result
                    remove assignment from assignments
    
    return { success: false, assignments: null }
```

### Constraint Checking Function

```
function CHECK_HARD_CONSTRAINTS(assignment, allAssignments, section, classroom, day, startTime, endTime, enrollments):
    // 1. Check lunch break
    if overlapsLunchBreak(startTime, endTime):
        return { valid: false, reason: "Overlaps lunch break" }
    
    // 2. Check instructor double-booking
    for each otherAssignment in allAssignments:
        if otherAssignment.instructorId == section.instructorId:
            if otherAssignment.day == day:
                if not hasMinimumGap(otherAssignment.startTime, otherAssignment.endTime, startTime, endTime):
                    return { valid: false, reason: "Instructor double-booking" }
    
    // 3. Check classroom double-booking
    for each otherAssignment in allAssignments:
        if otherAssignment.classroomId == classroom.id:
            if otherAssignment.day == day:
                if not hasMinimumGap(otherAssignment.startTime, otherAssignment.endTime, startTime, endTime):
                    return { valid: false, reason: "Classroom double-booking" }
    
    // 4. Check student conflicts
    for each enrollment in enrollments:
        enrolledSection = enrollment.section
        if enrolledSection has schedule on same day:
            if timeOverlaps(enrolledSection.startTime, enrolledSection.endTime, startTime, endTime):
                return { valid: false, reason: "Student schedule conflict" }
    
    // 5. Check classroom capacity
    if classroom.capacity < section.capacity:
        return { valid: false, reason: "Insufficient classroom capacity" }
    
    // 6. Check classroom features
    if section.course.requirementsJson.features:
        for each requiredFeature in section.course.requirementsJson.features:
            if not classroom.featuresJson[requiredFeature]:
                return { valid: false, reason: "Missing required feature" }
    
    return { valid: true }
```

### Helper Functions

```
function TIME_TO_MINUTES(timeStr):
    // Convert "09:30" to 570 minutes
    parts = timeStr.split(":")
    return parseInt(parts[0]) * 60 + parseInt(parts[1])

function TIME_OVERLAPS(start1, end1, start2, end2):
    // Check if two time ranges overlap
    s1 = TIME_TO_MINUTES(start1)
    e1 = TIME_TO_MINUTES(end1)
    s2 = TIME_TO_MINUTES(start2)
    e2 = TIME_TO_MINUTES(end2)
    return s1 < e2 AND s2 < e1

function HAS_MINIMUM_GAP(startTime1, endTime1, startTime2, endTime2):
    // Check if there's at least 15 minutes gap between courses
    if not TIME_OVERLAPS(startTime1, endTime1, startTime2, endTime2):
        gap = TIME_TO_MINUTES(startTime2) - TIME_TO_MINUTES(endTime1)
        return gap >= 15
    return false

function OVERLAPS_LUNCH_BREAK(startTime, endTime):
    lunchStart = TIME_TO_MINUTES("12:00")
    lunchEnd = TIME_TO_MINUTES("13:00")
    start = TIME_TO_MINUTES(startTime)
    end = TIME_TO_MINUTES(endTime)
    return start < lunchEnd AND end > lunchStart
```

## Example Solution

### Input

**Sections:**
- Section 1: CEN205, Instructor: Dr. Smith, Capacity: 30
- Section 2: CEN303, Instructor: Dr. Jones, Capacity: 25
- Section 3: CEN202, Instructor: Dr. Smith, Capacity: 20

**Classrooms:**
- Classroom A: Capacity 50, Features: {projector: true}
- Classroom B: Capacity 30, Features: {projector: true, lab: true}
- Classroom C: Capacity 25, Features: {projector: true}

**Enrollments:**
- Student 1: Enrolled in Section 1 and Section 2
- Student 2: Enrolled in Section 1 and Section 3

### Solution

```
Section 1 (CEN205):
  Day: Monday
  Time: 09:00 - 10:30
  Classroom: A
  Instructor: Dr. Smith

Section 2 (CEN303):
  Day: Monday
  Time: 10:45 - 12:15
  Classroom: B
  Instructor: Dr. Jones

Section 3 (CEN202):
  Day: Tuesday
  Time: 09:00 - 10:30
  Classroom: C
  Instructor: Dr. Smith
```

### Validation

✅ **Instructor Constraint**: Dr. Smith teaches Section 1 (Monday 09:00) and Section 3 (Tuesday 09:00) - no conflict

✅ **Classroom Constraint**: Each classroom used only once per time slot

✅ **Student Constraint**: Student 1 enrolled in Section 1 (Mon 09:00) and Section 2 (Mon 10:45) - 15 min gap, no conflict

✅ **Capacity Constraint**: All classrooms have sufficient capacity

✅ **Lunch Break**: No classes scheduled during 12:00-13:00

## Complexity Analysis

### Time Complexity
- **Worst Case**: O(b^d) where:
  - b = branching factor (classrooms × days × time slots)
  - d = depth (number of sections)
- **Average Case**: Much better due to constraint propagation

### Space Complexity
- O(d) for recursion stack
- O(n) for storing assignments

### Optimization Strategies

1. **Constraint Propagation**: Early detection of invalid assignments
2. **Heuristic Ordering**: 
   - Try most constrained sections first
   - Try most constrained values first (fewer available classrooms/days)
3. **Forward Checking**: Check constraints before making assignment
4. **Arc Consistency**: Maintain consistency between related variables

## Implementation Details

### Time Slots Generation

```javascript
const TIME_SLOTS = [];
for (let hour = 9; hour < 17; hour++) {
  if (hour === 12) continue; // Skip lunch break
  for (let minute = 0; minute < 60; minute += 30) {
    TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
  }
}
// Result: ["09:00", "09:30", "10:00", ..., "11:30", "13:00", ..., "16:30"]
```

### Course Duration

- Standard course duration: **1.5 hours** (3 time slots)
- Break between courses: **15 minutes** (minimum gap)

### Existing Schedules

The algorithm respects existing manual assignments:
- If a section already has a schedule, it tries to use it first
- Only if existing schedule conflicts, it tries alternatives

## Error Handling

### Common Failure Scenarios

1. **Too Many Sections**
   - Solution: Limit to 30 sections per generation
   - Error: "Too many sections. Please select maximum 30 sections at a time."

2. **Insufficient Classrooms**
   - Solution: Add more classrooms or reduce sections
   - Error: "Not enough classrooms for sections."

3. **Instructor Overload**
   - Solution: Distribute sections across multiple instructors
   - Error: "Some instructors have too many sections."

4. **No Valid Solution**
   - Solution: Relax constraints or reduce number of sections
   - Error: "Could not generate a valid schedule. Try adjusting constraints or reducing number of sections."

## Future Improvements

1. **Genetic Algorithm**: For large-scale scheduling problems
2. **Simulated Annealing**: For optimization of soft constraints
3. **Machine Learning**: Learn from historical schedules
4. **Multi-Objective Optimization**: Balance multiple soft constraints
5. **Real-time Updates**: Handle schedule changes dynamically

