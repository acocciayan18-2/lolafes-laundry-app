import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import "../style/dashboard.css";


const getCurrentDate = () => {
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  return new Date().toLocaleDateString("en-US", options);
};

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  
  const statsList = [
    { label: "Today's Revenue", value: "₱0.00", icon: "fas fa-chart-line", color: "green" },
    { label: "Pending", value: "1", icon: "fas fa-clock", color: "orange" },
    { label: "Ready", value: "2", icon: "fas fa-check-circle", color: "blue" },
    { label: "In Progress", value: "0", icon: "fas fa-box", color: "purple" },
  ];

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  
  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to log out?");
    
    if (confirmLogout) {
      try {
        await signOut(auth);
        navigate("/login");
      } catch (error) {
        console.error("Logout failed:", error);
      }
    }
  };

  return (
    <div className="dashboard-container bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      
      <main className="main-content">
       
        <button className="menu-toggle" onClick={toggleSidebar}>
          <i className="fas fa-bars"></i>
        </button>

        
        <header>
          <h2>Good Evening!</h2>
          <p>Welcome back to your laundry shop dashboard</p>
          <small>{getCurrentDate()}</small>

          <div className="header-buttons">
            <button className="btn-primary" onClick={() => navigate('/main/neworder')}>
              <i className="fas fa-plus"></i> New Order
            </button>
            <button className="btn-outline" onClick={() => navigate('/main/customers')}>
              <i className="fas fa-users"></i> Customers
            </button>
          </div>
        </header>

      
        <section className="stats-cards">
          {statsList.map((stat, index) => (
            <div className="card" key={index}>
              <div className={`icon ${stat.color}`}>
                <i className={stat.icon}></i>
              </div>
              <div>
                <h4>{stat.value}</h4>
                <small>{stat.label}</small>
              </div>
            </div>
          ))}
        </section>

        
        <section className="orders">
          <h5>
            <i className="fas fa-clipboard-list"></i> Today's Orders (0)
          </h5>
          <div className="empty">
            <i className="fas fa-tshirt fa-3x"></i>
            <p>No orders created today yet</p>
          </div>
        </section>

      </main>
    </div>
  );
}