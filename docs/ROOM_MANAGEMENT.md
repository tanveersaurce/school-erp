# Room & Physical Facility Management (Phase 9)

## 1. Overview

The Room & Physical Facility subsystem tracks physical learning spaces across campus locations. It establishes infrastructure availability, seating limits, and equipment types for timetable allocations.

---

## 2. Classroom Data Model (`Classroom`)

| Field | Type | Description |
|---|---|---|
| `tenantId` | `ObjectId` | Multi-tenant discriminator |
| `schoolId` | `ObjectId` | School discriminator |
| `campusId` | `ObjectId` | Campus location |
| `name` | `string` | Human-readable room title (e.g., "Physics Lab 2", "Lecture Hall A") |
| `code` | `string` | Unique alphanumeric code (e.g., "SCI-LAB-02", "AUD-01") |
| `roomNumber` | `string` | Optional physical door number (e.g., "204") |
| `capacity` | `number` | Maximum student seating capacity |
| `roomType` | `RoomType` | `CLASSROOM`, `LAB`, `AUDITORIUM`, `LIBRARY`, `PLAYGROUND`, `OTHER` |
| `status` | `AcademicStatus` | `ACTIVE`, `INACTIVE` |

---

## 3. Disambiguation with Hostel Rooms

In accordance with architectural standards:
- **Academic Classrooms**: Registered as `'Classroom'` in `@edusphere/database` (`ClassroomSchema`).
- **Residential Living**: Registered as `'Room'` in `hostel.model.ts`.
This explicit naming eliminates any collision between academic facilities and residential student dorms.

---

## 4. Occupancy & Utilization

The 2D Room Occupancy Grid (`/api/v1/timetable/timetables/:id/views/room/:roomId`) aggregates all periods across working days for a selected facility:
- Highlights active classes, assigned subjects, and faculty.
- Identifies vacant periods available for booking, study sessions, or ad-hoc seminars.
