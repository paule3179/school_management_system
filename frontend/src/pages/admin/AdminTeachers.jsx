import React from 'react';

const AdminTeachers = ({ API_BASE }) => {
  return (
    <div>
      <h3>Admin - Teachers</h3>
      <p>Placeholder component.</p>
      {API_BASE && <small>API: {API_BASE}</small>}
    </div>
  );
};

export default AdminTeachers;

