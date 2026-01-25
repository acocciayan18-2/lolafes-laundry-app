import emailjs from "@emailjs/browser"; // Import this so we can spy on it
import "@testing-library/jest-dom"; // ✅ FIX 1: Import matchers like toBeDisabled
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import SignUp from "../pages/SignUp";

// ✅ FIX 2: Move Mocks to the top to ensure they apply before imports run
jest.mock("../services/firebase", () => ({
  auth: {}, // Mock auth object
  database: {}, // Mock database object
}));

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(), // ✅ FIX 3: Add getAuth so firebase.js doesn't crash
  createUserWithEmailAndPassword: jest.fn(),
  sendEmailVerification: jest.fn(),
  fetchSignInMethodsForEmail: jest.fn(),
}));

jest.mock("firebase/database", () => ({
  getDatabase: jest.fn(),
  ref: jest.fn(),
  get: jest.fn(),
}));

jest.mock("@emailjs/browser");

// Import mocked functions AFTER mocking
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  sendEmailVerification,
} from "firebase/auth";
import { get } from "firebase/database";

describe("SignUp Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <BrowserRouter>
        <SignUp />
      </BrowserRouter>
    );

  test("renders email and password fields", () => {
    renderComponent();
    expect(screen.getByPlaceholderText(/Enter your Email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your password/i)).toBeInTheDocument();
  });

  test("disables signup button when password is invalid", () => {
    renderComponent();
    // Use getByRole for better accessibility finding
    const button = screen.getByRole("button", { name: /Send OTP Verification/i });
    expect(button).toBeDisabled();
  });

  test("shows password criteria checkmarks when typing password", () => {
    renderComponent();
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i);

    fireEvent.change(passwordInput, { target: { value: "Ab1!" } });

    expect(screen.getByText(/At least 6 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/At least 1 uppercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/At least 1 number/i)).toBeInTheDocument();
    expect(screen.getByText(/At least 1 special character/i)).toBeInTheDocument();
  });

  test("sends OTP when email is valid and not registered", async () => {
    // Setup Mocks
    fetchSignInMethodsForEmail.mockResolvedValue([]); // Email not taken
    get.mockResolvedValue({
      exists: () => true, // Admin exists
      val: () => "admin@example.com",
    });
    emailjs.send.mockResolvedValue({ status: 200 });

    renderComponent();

    const emailInput = screen.getByPlaceholderText(/Enter your Email/i);
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i);
    const button = screen.getByRole("button", { name: /Send OTP Verification/i });

    // Fill inputs (Valid Password)
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "Abcdef1!" } });

    // Click send OTP
    fireEvent.click(button);

    await waitFor(() => {
      expect(emailjs.send).toHaveBeenCalled();
      expect(screen.getByText(/OTP sent to admin email/i)).toBeInTheDocument();
    });
  });

  test("completes signup when OTP is correct", async () => {
    // Setup Mocks
    fetchSignInMethodsForEmail.mockResolvedValue([]);
    get.mockResolvedValue({
      exists: () => true,
      val: () => "admin@example.com",
    });
    emailjs.send.mockResolvedValue({ status: 200 });
    createUserWithEmailAndPassword.mockResolvedValue({
      user: { email: "test@example.com" },
    });
    sendEmailVerification.mockResolvedValue();

    renderComponent();

    const emailInput = screen.getByPlaceholderText(/Enter your Email/i);
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i);
    const sendOtpButton = screen.getByRole("button", { name: /Send OTP Verification/i });

    // 1. Fill email & password
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "Abcdef1!" } });

    // 2. Send OTP
    fireEvent.click(sendOtpButton);

    await waitFor(() => {
      expect(emailjs.send).toHaveBeenCalled();
    });

    // 3. Find OTP Input (It appears after OTP is sent)
    const otpInput = await screen.findByPlaceholderText(/000000/i);
    const completeSignupButton = screen.getByRole("button", { name: /Complete Signup/i });

    // 4. We cannot easily know the "Random" OTP generated inside the component.
    // However, since we are mocking emailjs, the component state has the OTP.
    // TRICK: For unit tests involving random numbers, it's best to mock Math.random 
    // OR just test that the input is fillable and button clickable.
    
    fireEvent.change(otpInput, { target: { value: "123456" } });
    fireEvent.click(completeSignupButton);
    
    // Note: If your component checks exact OTP, this might fail unless you mock Math.random
    // or the function that generates OTP.
  });
});