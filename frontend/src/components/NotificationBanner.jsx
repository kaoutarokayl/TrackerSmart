import React from "react";

const NotificationBanner = ({ message, onClose }) => (
  <div className="fixed top-6 right-6 z-50 bg-yellow-100 border border-yellow-400 text-yellow-800 px-6 py-3 rounded shadow-lg flex items-center">
    <span>{message}</span>
    <button className="ml-4 text-yellow-700 font-bold" onClick={onClose}>X</button>
  </div>
);

export default NotificationBanner;