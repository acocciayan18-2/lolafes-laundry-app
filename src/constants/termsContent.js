// src/constants/termsContent.js

export const TERMS_AND_POLICY = {
  lastUpdated: "March 10, 2026",
  sections: [
    {
      id: "university",
      title: "Academic Context & Project Scope",
      content: "This System is developed as a primary project requirement for the subject Software Engineering 2. It is recognized strictly as an academic software solution. The University and assigned Professors are exempt from all liability regarding business losses, data breaches, or hardware failures occurring during shop operations. Professors maintain audit rights for evaluative and academic purposes only."
    },
    {
      id: "intellectual_property",
      title: "Intellectual Property & Software Licensing",
      content: "The source code, architecture, and proprietary logic remain the Intellectual Property (IP) of the Developers. The Business Owner is granted a non-exclusive, non-transferable license to use the System for their specific shop operations. The Business Owner is strictly prohibited from copying, distributing, reselling, or repackaging the System for other businesses or commercial entities without explicit written consent from the Developers."
    },
    {
      id: "ph_law",
      title: "Compliance with R.A. 10173 (Data Privacy Act of 2012)",
      content: "This System operates in strict adherence to the Data Privacy Act of 2012 of the Philippines. Upon formal turnover of the System, the Developers (acting as the initial Personal Information Processors) are absolved of all liability regarding data mishandling, unauthorized access, or leaks. The Business Owner assumes the role of the Personal Information Controller (PIC) and is legally responsible for ensuring the confidentiality, integrity, and availability of all collected data."
    },
    {
      id: "financial_liability",
      title: "Financial Accuracy & Hold Harmless",
      content: "While the System is designed to accurately calculate order totals, change due, and daily analytics, the Developers are not liable for any financial discrepancies, missing funds, or accounting errors. It remains the sole responsibility of the Business Owner and Staff to physically verify all cash handling, drawer counts, and final daily remittances."
    },
    {
      id: "hardware_liability",
      title: "Hardware Maintenance & Compatibility",
      content: "The System is designed to interface with specific thermal printers (USB/Bluetooth) and web-enabled devices. The Developers are not responsible for the maintenance, repair, or replacement of any physical hardware, including tablets, computers, routers, or printers. Any issues arising from hardware degradation, OS updates, or physical connectivity drops are outside the scope of the Developer's liability."
    },
    {
      id: "third_party",
      title: "Third-Party Technology & API Liability",
      content: "The System utilizes third-party technologies, including but not limited to Google Firebase, EmailJS, Vercel, and various open-source libraries. The Business Owner and Staff are solely responsible for managing these accounts, including the payment of subscription fees and adherence to their respective Terms of Service. The Developers are not liable for service interruptions, data loss, or security vulnerabilities originating from these third-party providers."
    },
    {
      id: "system_uptime",
      title: "System Availability & Service Quotas",
      content: "The System's availability is contingent on the operational status of its hosting and database providers. Certain features, such as automated notifications or real-time tracking, may be subject to daily usage limits or quotas imposed by third-party APIs. The Developers do not guarantee 100% uninterrupted uptime and are not liable for business delays caused by server outages, network failures, or exceeded API quotas."
    },
    {
      id: "developer_compensation",
      title: "Post-Delivery Service & Professional Fees",
      content: "The initial development phase is considered complete upon turnover. A 'Stabilization Period' of thirty (30) days is granted for minor bug fixes. Following this period, any requests for technical support, system adjustments, error patching, or the addition of new functionalities shall be treated as a new professional engagement. The Developers shall be entitled to a Professional Fee (PF) at a rate agreed upon by both parties. No work shall commence until compensation terms are finalized."
    },
    {
      id: "owner",
      title: "Business Owner (Personal Information Controller)",
      content: "As the PIC, the Owner is responsible for implementing organizational, physical, and technical security measures. This includes the regular monitoring of Staff Audit Trails and ensuring that the System's Privacy Mode is utilized during shop hours to prevent accidental PII exposure."
    },
    {
      id: "staff",
      title: "Staff Confidentiality Agreement",
      content: "Staff members are legally bound to protect customer data. Any attempt to export, photograph, or distribute customer name, phone numbers or addresses for purposes outside of order fulfillment is a violation of this policy and the Data Privacy Act of 2012, which may result in legal action."
    },
    {
      id: "customer",
      title: "Customer Consent",
      content: "By providing personal information, customers consent to the processing of their data for laundry services and automated SMS notifications. Customers retain the right to be informed, to object, and to access their data as provided under Philippine Law."
    },
    {
      id: "privacy_protocol",
      title: "Data Collection & Protection Protocol",
      content: "All data processing is conducted solely for service fulfillment under R.A. 10173. It is the responsibility of the Owner to rotate API keys and database credentials annually. Once the system is live, the Developer acts strictly as a technical provider and not as a data custodian."
    }
  ]
};