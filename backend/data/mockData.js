// Complete mock database for School Management System
const mockData = {
  // Students data
  students: [
    {
      id: 1,
      admission_number: "2024-001",
      first_name: "John",
      last_name: "Mensah",
      date_of_birth: "2013-05-15",
      gender: "M",
      class_id: 2,
      level: "Primary",
      parent_id: 1,
      teacher_id: 1,
      address: "123 Liberation Road, Accra",
      enrollment_date: "2024-01-10",
      status: "active",
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      admission_number: "2024-002",
      first_name: "Mary",
      last_name: "Asare",
      date_of_birth: "2013-08-22",
      gender: "F",
      class_id: 2,
      level: "Primary",
      parent_id: 2,
      teacher_id: 1,
      address: "45 Cantonments, Accra",
      enrollment_date: "2024-01-10",
      status: "active",
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      admission_number: "2024-003",
      first_name: "David",
      last_name: "Boateng",
      date_of_birth: "2010-03-10",
      gender: "M",
      class_id: 3,
      level: "JHS",
      parent_id: 3,
      teacher_id: 2,
      address: "78 Adenta, Accra",
      enrollment_date: "2024-01-10",
      status: "active",
      created_at: new Date().toISOString()
    },
    {
      id: 4,
      admission_number: "2024-004",
      first_name: "Ama",
      last_name: "Serwaa",
      date_of_birth: "2019-07-18",
      gender: "F",
      class_id: 1,
      level: "KG",
      parent_id: 4,
      teacher_id: 3,
      address: "12 East Legon, Accra",
      enrollment_date: "2024-01-15",
      status: "active",
      created_at: new Date().toISOString()
    }
  ],
  
  // Classes data
  classes: [
    { 
      id: 1, 
      name: "KG2A", 
      level: "KG", 
      capacity: 25, 
      current_count: 1,
      teacher_id: 3,
      classroom: "Room 101",
      academic_year: "2024-2025"
    },
    { 
      id: 2, 
      name: "P5A", 
      level: "Primary", 
      capacity: 35, 
      current_count: 2,
      teacher_id: 1,
      classroom: "Room 205",
      academic_year: "2024-2025"
    },
    { 
      id: 3, 
      name: "JHS2A", 
      level: "JHS", 
      capacity: 40, 
      current_count: 1,
      teacher_id: 2,
      classroom: "Room 301",
      academic_year: "2024-2025"
    }
  ],
  
  // Teachers data
  teachers: [
    {
      id: 1,
      teacher_code: "TCH001",
      first_name: "Kwame",
      last_name: "Adjei",
      email: "kwame.adjei@school.edu",
      phone: "0244111222",
      subject_specialty: "Mathematics",
      qualifications: "B.Ed Mathematics",
      employment_date: "2020-09-01",
      status: "active"
    },
    {
      id: 2,
      teacher_code: "TCH002",
      first_name: "Ama",
      last_name: "Osei",
      email: "ama.osei@school.edu",
      phone: "0244333444",
      subject_specialty: "English",
      qualifications: "B.Ed English",
      employment_date: "2019-09-01",
      status: "active"
    },
    {
      id: 3,
      teacher_code: "TCH003",
      first_name: "Michael",
      last_name: "Asare",
      email: "michael.asare@school.edu",
      phone: "0244555666",
      subject_specialty: "Kindergarten",
      qualifications: "Diploma in Early Childhood",
      employment_date: "2021-09-01",
      status: "active"
    }
  ],
  
  // Parents data
  parents: [
    {
      id: 1,
      first_name: "James",
      last_name: "Mensah",
      phone: "0244123456",
      email: "james@example.com",
      occupation: "Engineer",
      address: "123 Liberation Road, Accra",
      relationship: "Father"
    },
    {
      id: 2,
      first_name: "Elizabeth",
      last_name: "Asare",
      phone: "0244789012",
      email: "elizabeth@example.com",
      occupation: "Teacher",
      address: "45 Cantonments, Accra",
      relationship: "Mother"
    },
    {
      id: 3,
      first_name: "Joseph",
      last_name: "Boateng",
      phone: "0244556789",
      email: "joseph@example.com",
      occupation: "Doctor",
      address: "78 Adenta, Accra",
      relationship: "Father"
    },
    {
      id: 4,
      first_name: "Kofi",
      last_name: "Serwaa",
      phone: "0244998877",
      email: "kofi@example.com",
      occupation: "Businessman",
      address: "12 East Legon, Accra",
      relationship: "Father"
    }
  ],
  
  // Subjects for each level
  subjects: {
    KG: ["Literacy", "Numeracy", "Creative Arts", "Our World Our People", "Physical Development"],
    Primary: ["English", "Mathematics", "Science", "Ghanaian Language", "Creative Arts", "RME", "PE", "History", "French"],
    JHS: ["Mathematics", "English", "Science", "Social Studies", "Computing", "Career Technology", "RME", "Creative Arts", "PE"]
  },
  
  // Grades/Assessments
  grades: [
    {
      id: 1,
      student_id: 1,
      subject: "Mathematics",
      term: 1,
      term_name: "First Term",
      academic_year: "2024-2025",
      class_id: 2,
      continuous_assessment: 78,
      project_score: 85,
      exam_score: 82,
      total_score: 81.5,
      grade: "B",
      grade_point: 4.0,
      remarks: "Good performance",
      recorded_by: 1,
      recorded_at: new Date().toISOString()
    },
    {
      id: 2,
      student_id: 1,
      subject: "English",
      term: 1,
      term_name: "First Term",
      academic_year: "2024-2025",
      class_id: 2,
      continuous_assessment: 65,
      project_score: 70,
      exam_score: 68,
      total_score: 67.5,
      grade: "C+",
      grade_point: 3.0,
      remarks: "Satisfactory, needs improvement in reading",
      recorded_by: 1,
      recorded_at: new Date().toISOString()
    },
    {
      id: 3,
      student_id: 2,
      subject: "Mathematics",
      term: 1,
      term_name: "First Term",
      academic_year: "2024-2025",
      class_id: 2,
      continuous_assessment: 92,
      project_score: 95,
      exam_score: 88,
      total_score: 91.5,
      grade: "A",
      grade_point: 5.0,
      remarks: "Excellent! Keep it up",
      recorded_by: 1,
      recorded_at: new Date().toISOString()
    }
  ],
  
  // Attendance records
  attendance: [
    {
      id: 1,
      student_id: 1,
      date: "2024-03-15",
      status: "present",
      check_in: "07:55",
      check_out: "14:30",
      term: 1,
      term_name: "First Term",
      academic_year: "2024-2025",
      remarks: ""
    },
    {
      id: 2,
      student_id: 2,
      date: "2024-03-15",
      status: "present",
      check_in: "08:00",
      check_out: "14:30",
      term: 1,
      term_name: "First Term",
      academic_year: "2024-2025",
      remarks: ""
    },
    {
      id: 3,
      student_id: 3,
      date: "2024-03-15",
      status: "late",
      check_in: "08:25",
      check_out: "14:30",
      term: 1,
      term_name: "First Term",
      academic_year: "2024-2025",
      remarks: "Came late due to traffic"
    },
    {
      id: 4,
      student_id: 4,
      date: "2024-03-15",
      status: "absent",
      check_in: null,
      check_out: null,
      term: 1,
      term_name: "First Term",
      academic_year: "2024-2025",
      remarks: "Sick - parent called"
    }
  ],
  
  // Timetable/Schedule
  timetables: [
    {
      id: 1,
      class_id: 2,
      day: "Monday",
      periods: [
        { period: 1, time: "08:00-08:40", subject: "Mathematics", teacher_id: 1 },
        { period: 2, time: "08:40-09:20", subject: "English", teacher_id: 2 },
        { period: 3, time: "09:20-10:00", subject: "Science", teacher_id: 1 },
        { period: 4, time: "10:00-10:40", subject: "Ghanaian Language", teacher_id: 4 },
        { period: 5, time: "11:00-11:40", subject: "Creative Arts", teacher_id: 5 },
        { period: 6, time: "11:40-12:20", subject: "RME", teacher_id: 6 }
      ]
    },
    {
      id: 2,
      class_id: 2,
      day: "Tuesday",
      periods: [
        { period: 1, time: "08:00-08:40", subject: "English", teacher_id: 2 },
        { period: 2, time: "08:40-09:20", subject: "Mathematics", teacher_id: 1 },
        { period: 3, time: "09:20-10:00", subject: "History", teacher_id: 7 },
        { period: 4, time: "10:00-10:40", subject: "French", teacher_id: 8 },
        { period: 5, time: "11:00-11:40", subject: "PE", teacher_id: 9 },
        { period: 6, time: "11:40-12:20", subject: "Science", teacher_id: 1 }
      ]
    },
    {
      id: 3,
      class_id: 3,
      day: "Monday",
      periods: [
        { period: 1, time: "08:00-08:40", subject: "Mathematics", teacher_id: 1 },
        { period: 2, time: "08:40-09:20", subject: "English", teacher_id: 2 },
        { period: 3, time: "09:20-10:00", subject: "Science", teacher_id: 1 },
        { period: 4, time: "10:00-10:40", subject: "Social Studies", teacher_id: 10 },
        { period: 5, time: "11:00-11:40", subject: "Computing", teacher_id: 11 },
        { period: 6, time: "11:40-12:20", subject: "Career Technology", teacher_id: 12 }
      ]
    }
  ],

  // Fee payment tracking
  fees: [
    {
      id: 1,
      student_id: 1,
      fee_type: "School Fees",
      term: 1,
      term_name: "First Term",
      academic_year: "2024-2025",
      amount: 350.00,
      paid_amount: 350.00,
      balance: 0,
      status: "paid",
      payment_date: "2024-01-15",
      payment_method: "Mobile Money",
      transaction_id: "TXN123456",
      receipt_number: "RCP001",
      recorded_by: 1
    },
    {
      id: 2,
      student_id: 1,
      fee_type: "PTA Levy",
      term: 1,
      term_name: "First Term",
      academic_year: "2024-2025",
      amount: 50.00,
      paid_amount: 50.00,
      balance: 0,
      status: "paid",
      payment_date: "2024-01-15",
      payment_method: "Cash",
      transaction_id: null,
      receipt_number: "RCP002",
      recorded_by: 1
    },
    {
      id: 3,
      student_id: 2,
      fee_type: "School Fees",
      term: 1,
      term_name: "First Term",
      academic_year: "2024-2025",
      amount: 350.00,
      paid_amount: 200.00,
      balance: 150.00,
      status: "partial",
      payment_date: "2024-01-20",
      payment_method: "Bank Transfer",
      transaction_id: "TXN123789",
      receipt_number: "RCP003",
      recorded_by: 1
    },
    {
      id: 4,
      student_id: 3,
      fee_type: "School Fees",
      term: 1,
      term_name: "First Term",
      academic_year: "2024-2025",
      amount: 400.00,
      paid_amount: 0,
      balance: 400.00,
      status: "unpaid",
      payment_date: null,
      payment_method: null,
      transaction_id: null,
      receipt_number: null,
      recorded_by: 1
    }
  ],

  fee_types: [
    { id: 1, name: "School Fees", amount: 350.00, frequency: "termly", applicable_levels: ["Primary", "JHS"] },
    { id: 2, name: "PTA Levy", amount: 50.00, frequency: "termly", applicable_levels: ["KG", "Primary", "JHS"] },
    { id: 3, name: "Development Levy", amount: 100.00, frequency: "annually", applicable_levels: ["Primary", "JHS"] },
    { id: 4, name: "Examination Fees", amount: 75.00, frequency: "termly", applicable_levels: ["JHS"] }
  ],

  // Exam management
  exams: [
    {
      id: 1,
      name: "First Term Examination",
      term: 1,
      term_name: "First Term",
      academic_year: "2024-2025",
      start_date: "2024-03-20",
      end_date: "2024-03-28",
      status: "upcoming",
      classes_involved: [1, 2, 3]
    },
    {
      id: 2,
      name: "Second Term Examination",
      term: 2,
      term_name: "Second Term",
      academic_year: "2024-2025",
      start_date: "2024-07-15",
      end_date: "2024-07-22",
      status: "upcoming",
      classes_involved: [1, 2, 3]
    }
  ],

  exam_timetables: [
    {
      id: 1,
      exam_id: 1,
      class_id: 2,
      subject: "Mathematics",
      date: "2024-03-20",
      time: "09:00-11:00",
      venue: "Hall A"
    },
    {
      id: 2,
      exam_id: 1,
      class_id: 2,
      subject: "English",
      date: "2024-03-21",
      time: "09:00-11:00",
      venue: "Hall A"
    },
    {
      id: 3,
      exam_id: 1,
      class_id: 3,
      subject: "Mathematics",
      date: "2024-03-20",
      time: "09:00-11:00",
      venue: "Hall B"
    }
  ],

  // Messages/Notifications
  messages: [
    {
      id: 1,
      sender_id: 1,
      sender_type: "admin",
      receiver_id: 1,
      receiver_type: "parent",
      subject: "Parent-Teacher Conference",
      message: "Dear Parent, there will be a Parent-Teacher Conference on March 25th at 9:00 AM.",
      status: "sent",
      priority: "high",
      sent_at: "2024-03-10T10:00:00Z",
      read_at: null
    },
    {
      id: 2,
      sender_id: 1,
      sender_type: "teacher",
      receiver_id: 1,
      receiver_type: "parent",
      subject: "Student Progress",
      message: "Your child John is doing well in Mathematics but needs improvement in English.",
      status: "sent",
      priority: "normal",
      sent_at: "2024-03-12T14:30:00Z",
      read_at: null
    },
    {
      id: 3,
      sender_id: 1,
      sender_type: "admin",
      receiver_id: "all_parents",
      receiver_type: "broadcast",
      subject: "School Closed",
      message: "School will be closed on Friday for staff training.",
      status: "sent",
      priority: "high",
      sent_at: "2024-03-14T08:00:00Z",
      read_at: null
    }
  ],

  announcements: [
    {
      id: 1,
      title: "First Term Exams Begin",
      content: "First term examinations will begin on March 20th. All students should prepare adequately.",
      posted_by: "admin",
      posted_date: "2024-03-01",
      expiry_date: "2024-03-30",
      target_audience: ["all"]
    },
    {
      id: 2,
      title: "PTA Meeting",
      content: "There will be a PTA meeting on March 25th at 2:00 PM in the school hall.",
      posted_by: "admin",
      posted_date: "2024-03-05",
      expiry_date: "2024-03-26",
      target_audience: ["parents"]
    }
  ],

  // Document management
  documents: [
    {
      id: 1,
      title: "John Mensah - Birth Certificate",
      type: "birth_certificate",
      category: "student_document",
      student_id: 1,
      uploaded_by: 1,
      file_name: "john_birth_certificate.pdf",
      file_size: 1024000,
      mime_type: "application/pdf",
      upload_date: "2024-01-10",
      status: "approved"
    },
    {
      id: 2,
      title: "Term 1 Report Card - P5A",
      type: "report_card",
      category: "academic",
      class_id: 2,
      term: 1,
      academic_year: "2024-2025",
      uploaded_by: 1,
      file_name: "p5a_term1_report.pdf",
      file_size: 2048000,
      mime_type: "application/pdf",
      upload_date: "2024-01-15",
      status: "published"
    },
    {
      id: 3,
      title: "Staff Handbook 2024",
      type: "handbook",
      category: "staff",
      uploaded_by: 1,
      file_name: "staff_handbook_2024.pdf",
      file_size: 5120000,
      mime_type: "application/pdf",
      upload_date: "2024-01-05",
      status: "published",
      target_audience: ["teachers", "admin"]
    }
  ],

  document_categories: [
    "student_document",
    "academic",
    "staff",
    "administrative",
    "external"
  ],

    // School Calendar
  calendar_events: [
    {
      id: 1,
      title: "First Term Begins",
      description: "Opening day for first term",
      event_type: "academic",
      start_date: "2024-01-10",
      end_date: "2024-01-10",
      start_time: "07:30",
      end_time: "14:00",
      venue: "School Assembly Hall",
      target_audience: ["all"],
      status: "completed",
      created_by: 1,
      created_at: "2024-01-01"
    },
    {
      id: 2,
      title: "Inter-School Sports Competition",
      description: "Annual sports competition between schools",
      event_type: "sports",
      start_date: "2024-02-15",
      end_date: "2024-02-17",
      start_time: "09:00",
      end_time: "16:00",
      venue: "Sports Field",
      target_audience: ["students", "teachers"],
      status: "upcoming",
      created_by: 1,
      created_at: "2024-01-15"
    },
    {
      id: 3,
      title: "Parent-Teacher Conference",
      description: "Meeting with parents to discuss student progress",
      event_type: "meeting",
      start_date: "2024-03-25",
      end_date: "2024-03-25",
      start_time: "09:00",
      end_time: "15:00",
      venue: "School Hall",
      target_audience: ["parents", "teachers"],
      status: "upcoming",
      created_by: 1,
      created_at: "2024-02-01"
    },
    {
      id: 4,
      title: "First Term Exams",
      description: "End of first term examinations",
      event_type: "exam",
      start_date: "2024-03-20",
      end_date: "2024-03-28",
      start_time: "08:00",
      end_time: "12:00",
      venue: "Various Classrooms",
      target_audience: ["students"],
      status: "upcoming",
      created_by: 1,
      created_at: "2024-02-10"
    },
    {
      id: 5,
      title: "Founders' Day Celebration",
      description: "Celebrating the school's founding",
      event_type: "celebration",
      start_date: "2024-05-10",
      end_date: "2024-05-10",
      start_time: "10:00",
      end_time: "14:00",
      venue: "School Auditorium",
      target_audience: ["all"],
      status: "upcoming",
      created_by: 1,
      created_at: "2024-03-01"
    }
  ],

  event_types: ["academic", "sports", "meeting", "exam", "celebration", "holiday", "other"],
  target_audiences: ["all", "students", "teachers", "parents", "staff"],

  // Library Management
  books: [
    {
      id: 1,
      isbn: "978-0743273565",
      title: "The Great Gatsby",
      author: "F. Scott Fitzgerald",
      publisher: "Scribner",
      publication_year: 1925,
      category: "Fiction",
      quantity: 5,
      available: 3,
      location: "Shelf A-1",
      status: "available",
      added_date: "2024-01-10"
    },
    {
      id: 2,
      isbn: "978-0061120084",
      title: "To Kill a Mockingbird",
      author: "Harper Lee",
      publisher: "HarperCollins",
      publication_year: 1960,
      category: "Fiction",
      quantity: 4,
      available: 2,
      location: "Shelf A-2",
      status: "available",
      added_date: "2024-01-10"
    },
    {
      id: 3,
      isbn: "978-0451524935",
      title: "1984",
      author: "George Orwell",
      publisher: "Signet Classic",
      publication_year: 1949,
      category: "Dystopian",
      quantity: 3,
      available: 1,
      location: "Shelf B-1",
      status: "available",
      added_date: "2024-01-10"
    },
    {
      id: 4,
      isbn: "978-0439023528",
      title: "The Hunger Games",
      author: "Suzanne Collins",
      publisher: "Scholastic",
      publication_year: 2008,
      category: "Young Adult",
      quantity: 6,
      available: 5,
      location: "Shelf C-1",
      status: "available",
      added_date: "2024-01-15"
    },
    {
      id: 5,
      isbn: "978-0547928227",
      title: "The Hobbit",
      author: "J.R.R. Tolkien",
      publisher: "Houghton Mifflin",
      publication_year: 1937,
      category: "Fantasy",
      quantity: 3,
      available: 2,
      location: "Shelf B-2",
      status: "available",
      added_date: "2024-01-15"
    }
  ],

  book_categories: ["Fiction", "Non-Fiction", "Fantasy", "Dystopian", "Young Adult", "Science", "Mathematics", "History"],

  borrow_records: [
    {
      id: 1,
      book_id: 1,
      student_id: 1,
      borrow_date: "2024-03-01",
      due_date: "2024-03-15",
      return_date: null,
      status: "borrowed",
      fine: 0,
      remarks: ""
    },
    {
      id: 2,
      book_id: 2,
      student_id: 2,
      borrow_date: "2024-03-05",
      due_date: "2024-03-19",
      return_date: "2024-03-18",
      status: "returned",
      fine: 0,
      remarks: "Book returned in good condition"
    },
    {
      id: 3,
      book_id: 3,
      student_id: 1,
      borrow_date: "2024-03-10",
      due_date: "2024-03-24",
      return_date: null,
      status: "overdue",
      fine: 5.00,
      remarks: "Overdue by 3 days"
    }
  ],

  // Transport Management
  vehicles: [
    {
      id: 1,
      registration_number: "GR-1234-20",
      driver_name: "Kwame Asante",
      driver_phone: "0244111222",
      capacity: 30,
      route: "East Legon Route",
      type: "School Bus",
      status: "active",
      maintenance_due: "2024-04-15",
      insurance_expiry: "2024-12-31"
    },
    {
      id: 2,
      registration_number: "GR-5678-20",
      driver_name: "Joseph Mensah",
      driver_phone: "0244333444",
      capacity: 25,
      route: "Adenta Route",
      type: "Mini Bus",
      status: "active",
      maintenance_due: "2024-03-20",
      insurance_expiry: "2024-11-30"
    },
    {
      id: 3,
      registration_number: "GR-9012-20",
      driver_name: "Michael Owusu",
      driver_phone: "0244555666",
      capacity: 20,
      route: "Tema Route",
      type: "Van",
      status: "maintenance",
      maintenance_due: "2024-03-01",
      insurance_expiry: "2024-10-15"
    }
  ],

  transport_routes: [
    {
      id: 1,
      name: "East Legon Route",
      stops: ["School", "Airport", "East Legon", "Shiashie", "Adjiringanor"],
      morning_pickup: "06:30",
      afternoon_dropoff: "15:30",
      vehicle_id: 1,
      active: true
    },
    {
      id: 2,
      name: "Adenta Route",
      stops: ["School", "Madina", "Adenta", "Pantang", "Ashale Botwe"],
      morning_pickup: "06:45",
      afternoon_dropoff: "15:45",
      vehicle_id: 2,
      active: true
    },
    {
      id: 3,
      name: "Tema Route",
      stops: ["School", "Tema Comm 1", "Tema Comm 5", "Tema Comm 7", "Community 11"],
      morning_pickup: "06:00",
      afternoon_dropoff: "16:00",
      vehicle_id: 3,
      active: false
    }
  ],

  transport_assignments: [
    {
      id: 1,
      student_id: 1,
      route_id: 1,
      vehicle_id: 1,
      pickup_point: "East Legon",
      dropoff_point: "East Legon",
      status: "active",
      term: 1,
      academic_year: "2024-2025"
    },
    {
      id: 2,
      student_id: 2,
      route_id: 2,
      vehicle_id: 2,
      pickup_point: "Adenta",
      dropoff_point: "Adenta",
      status: "active",
      term: 1,
      academic_year: "2024-2025"
    },
    {
      id: 3,
      student_id: 3,
      route_id: 1,
      vehicle_id: 1,
      pickup_point: "Airport",
      dropoff_point: "Airport",
      status: "active",
      term: 1,
      academic_year: "2024-2025"
    }
  ],

  // Inventory Management
  inventory_categories: [
    "Furniture", "Electronics", "Sports Equipment", "Stationery", "Teaching Aids", "Cleaning Supplies", "Kitchen Equipment"
  ],

  inventory_items: [
    {
      id: 1,
      name: "Student Desk",
      category: "Furniture",
      quantity: 200,
      unit: "pieces",
      unit_price: 250.00,
      total_value: 50000.00,
      location: "Classrooms",
      supplier: "Furniture World Ltd",
      purchase_date: "2023-08-15",
      condition: "good",
      last_inventory_date: "2024-01-10",
      status: "in_use",
      notes: ""
    },
    {
      id: 2,
      name: "Whiteboard Markers",
      category: "Stationery",
      quantity: 50,
      unit: "boxes",
      unit_price: 15.00,
      total_value: 750.00,
      location: "Store Room",
      supplier: "Stationery Plus",
      purchase_date: "2024-01-05",
      condition: "new",
      last_inventory_date: "2024-01-05",
      status: "in_stock",
      notes: "Each box contains 10 markers"
    },
    {
      id: 3,
      name: "Football",
      category: "Sports Equipment",
      quantity: 10,
      unit: "pieces",
      unit_price: 80.00,
      total_value: 800.00,
      location: "Sports Store",
      supplier: "Decathlon",
      purchase_date: "2023-12-10",
      condition: "good",
      last_inventory_date: "2024-01-10",
      status: "in_use",
      notes: ""
    },
    {
      id: 4,
      name: "Projector",
      category: "Electronics",
      quantity: 3,
      unit: "units",
      unit_price: 2500.00,
      total_value: 7500.00,
      location: "ICT Lab",
      supplier: "Electronics Hub",
      purchase_date: "2023-09-20",
      condition: "good",
      last_inventory_date: "2024-01-10",
      status: "in_use",
      notes: "Epson brand"
    },
    {
      id: 5,
      name: "Library Books",
      category: "Teaching Aids",
      quantity: 500,
      unit: "volumes",
      unit_price: 45.00,
      total_value: 22500.00,
      location: "Library",
      supplier: "Educational Books Ltd",
      purchase_date: "2023-07-10",
      condition: "good",
      last_inventory_date: "2024-01-10",
      status: "in_use",
      notes: "Various subjects"
    }
  ],

  inventory_transactions: [
    {
      id: 1,
      item_id: 1,
      transaction_type: "issued",
      quantity: 50,
      date: "2024-01-15",
      recipient: "Primary Department",
      issued_by: 1,
      purpose: "Classroom setup",
      status: "approved"
    },
    {
      id: 2,
      item_id: 2,
      transaction_type: "purchased",
      quantity: 30,
      date: "2024-01-20",
      recipient: "Store",
      issued_by: 1,
      purpose: "Restock",
      status: "completed"
    },
    {
      id: 3,
      item_id: 4,
      transaction_type: "damaged",
      quantity: 1,
      date: "2024-02-01",
      recipient: "Maintenance",
      issued_by: 2,
      purpose: "Needs repair",
      status: "pending"
    }
  ],

  stock_alerts: [
    {
      id: 1,
      item_id: 2,
      threshold: 20,
      current_quantity: 50,
      alert_type: "low_stock",
      status: "resolved"
    }
  ],

  
  // Users data for authentication
users: [
  {
    id: 1,
    email: "admin@school.edu",
    password: "$2a$10$xgZkQqQ7QXQ7QXQ7QXQ7QO", // "Admin123!" (hashed)
    first_name: "System",
    last_name: "Administrator",
    role: "admin",
    phone: "0244000001",
    mfa_enabled: false,
    mfa_secret: null,
    status: "active",
    last_login: null,
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    email: "kwame.adjei@school.edu",
    password: "$2a$10$xgZkQqQ7QXQ7QXQ7QXQ7QO", // "Teacher123!" (hashed)
    first_name: "Kwame",
    last_name: "Adjei",
    role: "teacher",
    phone: "0244111222",
    mfa_enabled: false,
    mfa_secret: null,
    status: "active",
    last_login: null,
    created_at: new Date().toISOString()
  },
  {
    id: 3,
    email: "james@example.com",
    password: "$2a$10$xgZkQqQ7QXQ7QXQ7QXQ7QO", // "Parent123!" (hashed)
    first_name: "James",
    last_name: "Mensah",
    role: "parent",
    phone: "0244123456",
    mfa_enabled: false,
    mfa_secret: null,
    status: "active",
    last_login: null,
    created_at: new Date().toISOString()
  },
  {
    id: 4,
    email: "john.mensah@school.edu",
    password: "$2a$10$xgZkQqQ7QXQ7QXQ7QXQ7QO", // "Student123!" (hashed)
    first_name: "John",
    last_name: "Mensah",
    role: "student",
    phone: null,
    mfa_enabled: false,
    mfa_secret: null,
    status: "active",
    last_login: null,
    created_at: new Date().toISOString()
  }
],
  
  // Helper functions
  getNextId(collection) {
    const ids = this[collection].map(item => item.id);
    return ids.length > 0 ? Math.max(...ids) + 1 : 1;
  },
  
  getStudentsByClass(classId) {
    return this.students.filter(s => s.class_id === classId && s.status === 'active');
  },
  
  getClassWithDetails(classId) {
    const classData = this.classes.find(c => c.id === classId);
    if (!classData) return null;
    const teacher = this.teachers.find(t => t.id === classData.teacher_id);
    const students = this.getStudentsByClass(classId);
    return { ...classData, teacher, student_count: students.length, students };
  }
};

module.exports = mockData;