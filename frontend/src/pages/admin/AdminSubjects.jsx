import React from 'react';

const AdminSubjects = ({ API_BASE }) => {
  return (
    <div>
      <h3>Admin - Subjects</h3>
      <p>Placeholder component.</p>
      {API_BASE && <small>API: {API_BASE}</small>}
    </div>
  );
};

export default AdminSubjects;

