const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const pool = require('../config/database');

const exportController = {
  // Export Students to Excel
  async exportStudentsToExcel(req, res) {
    try {
      const { class_id, level } = req.query;
      
      let query = `
        SELECT 
          s.admission_number,
          s.first_name,
          s.last_name,
          s.date_of_birth,
          s.gender,
          c.class_name,
          s.level,
          s.parent_name,
          s.parent_phone,
          s.address,
          s.enrollment_date,
          s.status
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE s.status = 'active'
      `;
      
      const params = [];
      if (class_id) {
        query += ` AND s.class_id = $${params.length + 1}`;
        params.push(class_id);
      }
      if (level) {
        query += ` AND s.level = $${params.length + 1}`;
        params.push(level);
      }
      
      query += ` ORDER BY s.last_name`;
      
      const result = await pool.query(query, params);
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Students');
      
      // Define columns
      worksheet.columns = [
        { header: 'Admission No', key: 'admission_number', width: 15 },
        { header: 'First Name', key: 'first_name', width: 15 },
        { header: 'Last Name', key: 'last_name', width: 15 },
        { header: 'Date of Birth', key: 'date_of_birth', width: 12 },
        { header: 'Gender', key: 'gender', width: 10 },
        { header: 'Class', key: 'class_name', width: 12 },
        { header: 'Level', key: 'level', width: 10 },
        { header: 'Parent Name', key: 'parent_name', width: 20 },
        { header: 'Parent Phone', key: 'parent_phone', width: 15 },
        { header: 'Address', key: 'address', width: 30 },
        { header: 'Enrollment Date', key: 'enrollment_date', width: 12 },
        { header: 'Status', key: 'status', width: 10 }
      ];
      
      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF76B900' }
      };
      
      // Add data
      result.rows.forEach(student => {
        worksheet.addRow({
          admission_number: student.admission_number,
          first_name: student.first_name,
          last_name: student.last_name,
          date_of_birth: student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : '',
          gender: student.gender === 'M' ? 'Male' : 'Female',
          class_name: student.class_name,
          level: student.level,
          parent_name: student.parent_name,
          parent_phone: student.parent_phone,
          address: student.address,
          enrollment_date: student.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString() : '',
          status: student.status
        });
      });
      
      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=students_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      await workbook.xlsx.write(res);
      res.end();
      
    } catch (error) {
      console.error('Error exporting students:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // Export Fees Report to Excel
  async exportFeesReport(req, res) {
    try {
      const { term, academic_year } = req.query;
      
let query = `
        SELECT 
          s.admission_number,
          s.first_name,
          s.last_name,
          c.class_name,
          f.fee_type,
          f.term_name,
          f.academic_year,
          f.amount,
          f.paid_amount,
          f.balance,
          f.status,
          f.payment_date,
          f.payment_method
        FROM fees f
        JOIN students s ON f.student_id = s.id
        JOIN classes c ON s.class_id = c.id
        WHERE 1=1
      `;
      
      const params = [];
      if (term) {
        query += ` AND f.term = $${params.length + 1}`;
        params.push(term);
      }
      if (academic_year) {
        query += ` AND f.academic_year = $${params.length + 1}`;
        params.push(academic_year);
      }
      
      query += ` ORDER BY s.last_name, f.term`;
      
      const result = await pool.query(query, params);
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Fees Report');
      
      worksheet.columns = [
        { header: 'Admission No', key: 'admission_number', width: 15 },
        { header: 'Student Name', key: 'student_name', width: 20 },
        { header: 'Class', key: 'class_name', width: 12 },
        { header: 'Fee Type', key: 'fee_type', width: 20 },
        { header: 'Term', key: 'term_name', width: 12 },
        { header: 'Academic Year', key: 'academic_year', width: 12 },
        { header: 'Amount (₵)', key: 'amount', width: 12 },
        { header: 'Paid (₵)', key: 'paid_amount', width: 12 },
        { header: 'Balance (₵)', key: 'balance', width: 12 },
        { header: 'Status', key: 'status', width: 10 },
        { header: 'Payment Date', key: 'payment_date', width: 12 },
        { header: 'Payment Method', key: 'payment_method', width: 15 }
      ];
      
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF76B900' }
      };
      
      result.rows.forEach(fee => {
        worksheet.addRow({
          admission_number: fee.admission_number,
          student_name: `${fee.first_name} ${fee.last_name}`,
          class_name: fee.class_name,
          fee_type: fee.fee_type,
          term_name: fee.term_name,
          academic_year: fee.academic_year,
          amount: fee.amount,
          paid_amount: fee.paid_amount,
          balance: fee.balance,
          status: fee.status,
          payment_date: fee.payment_date ? new Date(fee.payment_date).toLocaleDateString() : '',
          payment_method: fee.payment_method
        });
      });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=fees_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      await workbook.xlsx.write(res);
      res.end();
      
    } catch (error) {
      console.error('Error exporting fees report:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // Export Attendance Report to Excel
  async exportAttendanceReport(req, res) {
    try {
      const { class_id, term, academic_year } = req.query;
      
const studentsQuery = `
        SELECT 
          s.id,
          s.admission_number,
          s.first_name,
          s.last_name,
          c.class_name
        FROM students s
        JOIN classes c ON s.class_id = c.id
        WHERE s.class_id = $1 AND s.status = 'active'
        ORDER BY s.last_name
      `;
      
      const students = await pool.query(studentsQuery, [class_id]);
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Attendance Report');
      
      worksheet.columns = [
        { header: 'Admission No', key: 'admission_number', width: 15 },
        { header: 'Student Name', key: 'student_name', width: 20 },
        { header: 'Total Days', key: 'total_days', width: 12 },
        { header: 'Present', key: 'present', width: 10 },
        { header: 'Absent', key: 'absent', width: 10 },
        { header: 'Late', key: 'late', width: 10 },
        { header: 'Excused', key: 'excused', width: 10 },
        { header: 'Attendance Rate (%)', key: 'rate', width: 15 }
      ];
      
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF76B900' }
      };
      
      for (const student of students.rows) {
        const attendanceQuery = await pool.query(`
          SELECT 
            COUNT(*) as total_days,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
            SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
            SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
            SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused
          FROM attendance
          WHERE student_id = $1 AND term = $2 AND academic_year = $3
        `, [student.id, term, academic_year]);
        
        const stats = attendanceQuery.rows[0];
        const rate = stats.total_days > 0 ? (stats.present / stats.total_days) * 100 : 0;
        
        worksheet.addRow({
          admission_number: student.admission_number,
          student_name: `${student.first_name} ${student.last_name}`,
          total_days: stats.total_days,
          present: stats.present,
          absent: stats.absent,
          late: stats.late,
          excused: stats.excused,
          rate: rate.toFixed(2)
        });
      }
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      await workbook.xlsx.write(res);
      res.end();
      
    } catch (error) {
      console.error('Error exporting attendance report:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // Generate PDF Report Card
  async generatePDFReportCard(req, res) {
    try {
      const { studentId, term, academic_year } = req.query;

      // Parent access control: parents can only download their own children's report cards
      if (req.user?.role === 'parent') {
        const allowed = req.user.allowedStudentIds || [];
        const sid = parseInt(studentId);
        if (!allowed.includes(sid)) {
          return res.status(403).json({ success: false, error: 'Access denied. Parents can only download their children report cards.' });
        }
      }

      const reportCard = await gradeModel.generateReportCard(studentId, term, academic_year);

      
      const doc = new PDFDocument({ margin: 50 });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=report_card_${reportCard.student.admission_number}.pdf`);
      
      doc.pipe(res);
      
      // School Header
      doc.fontSize(20).font('Helvetica-Bold').text('ST. PETER\'S INTERNATIONAL SCHOOL', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text('P.O. Box 123, Accra - Ghana', { align: 'center' });
      doc.text('Tel: +233 24 412 3456 | Email: info@stpeters.edu.gh', { align: 'center' });
      doc.moveDown();
      
      doc.fontSize(14).font('Helvetica-Bold').text('STUDENT PROGRESS REPORT', { align: 'center' });
      doc.moveDown();
      
      // Student Information
      doc.fontSize(10).font('Helvetica-Bold').text('Student Information:');
      doc.font('Helvetica');
      doc.text(`Name: ${reportCard.student.name}`);
      doc.text(`Admission No: ${reportCard.student.admission_number}`);
      doc.text(`Class: ${reportCard.student.class}`);
      doc.text(`Term: ${reportCard.academic_info.term_name}, ${reportCard.academic_info.academic_year}`);
      doc.moveDown();
      
      // Grades Table
      doc.font('Helvetica-Bold').text('Grades:');
      doc.moveDown(0.5);
      
      // Draw table
      let y = doc.y;
      doc.font('Helvetica-Bold');
      doc.text('Subject', 50, y);
      doc.text('CA (40%)', 200, y);
      doc.text('Exam (60%)', 280, y);
      doc.text('Total', 360, y);
      doc.text('Grade', 420, y);
      
      y += 20;
      doc.font('Helvetica');
      
      reportCard.grades.forEach(grade => {
        doc.text(grade.subject, 50, y);
        doc.text(grade.continuous_assessment.toString(), 200, y);
        doc.text(grade.exam_score.toString(), 280, y);
        doc.text(grade.total_score.toString(), 360, y);
        doc.text(grade.grade, 420, y);
        y += 20;
      });
      
      doc.moveDown();
      
      // Summary
      doc.font('Helvetica-Bold').text('Summary:');
      doc.font('Helvetica');
      doc.text(`Average Score: ${reportCard.summary.average_score}%`);
      doc.text(`Overall Grade: ${reportCard.summary.overall_grade}`);
      doc.text(`Attendance Rate: ${reportCard.summary.attendance_rate}%`);
      doc.text(`Remarks: ${reportCard.summary.remarks}`);
      doc.moveDown();
      
      // Signatures
      doc.moveDown(2);
      doc.text('_________________________', 50, doc.y);
      doc.text('_________________________', 350, doc.y);
      doc.text('Teacher\'s Signature', 50, doc.y + 5);
      doc.text('Headteacher\'s Signature', 350, doc.y + 5);
      
      doc.end();
      
    } catch (error) {
      console.error('Error generating PDF report card:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = exportController;