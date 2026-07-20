import React from 'react';

const AdminStudents = ({ API_BASE }) => {
  return (
    <div>
      <h3>Admin - Students</h3>
      <p>Placeholder component.</p>
      {API_BASE && <small>API: {API_BASE}</small>}
    </div>
  );
};

export default AdminStudents;

