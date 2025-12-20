// // AppLayout.js
// import React, { useState, useEffect } from "react";
// import { Outlet, useNavigate } from "react-router-dom"; // ✅ import useNavigate
// import { LoginPopup } from "./modal/LoginPopup";
// import { onAuthStateChanged } from "firebase/auth";
// import { auth } from "./services/firebase";

// export default function AppLayout() {
//   const [popup, setPopup] = useState({ message: "", type: "" });
//   const navigate = useNavigate(); // ✅ initialize navigate

//   const showPopup = (message, type) => {
//     setPopup({ message, type });
//     setTimeout(() => setPopup({ message: "", type: "" }), 3000);
//   };

//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, (user) => {
//       if (user) {
//         console.log("User session restored:", user.email);
//         navigate("/dashboard"); // ✅ now works
//       } else {
//         console.log("No active session");
//         navigate("/login");
//       }
//     });

//     return () => unsubscribe();
//   }, [navigate]); // ✅ include navigate in deps

//   return (
//     <>
//       <Outlet context={{ showPopup }} />
//       <LoginPopup
//         message={popup.message}
//         type={popup.type}
//         onClose={() => setPopup({ message: "", type: "" })}
//       />
//     </>
//   );
// }
