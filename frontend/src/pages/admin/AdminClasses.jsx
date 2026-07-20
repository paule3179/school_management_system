import React from 'react';

const AdminClasses = ({ API_BASE }) => {
  return (
    <div>
      <h3>Admin - Classes</h3>
      <p>Placeholder component.</p>
      {API_BASE && <small>API: {API_BASE}</small>}
    </div>
  );
};

export default AdminClasses;

