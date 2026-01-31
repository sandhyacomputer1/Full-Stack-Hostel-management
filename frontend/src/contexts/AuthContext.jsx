import React, { createContext, useContext, useEffect, useReducer } from "react";
import { authAPI } from "../services/api";
import toast from "react-hot-toast";

const initialState = {
  user: null, // user object
  token: null, // JWT token
  isLoading: true,
  error: null,
};

// Action types
const AUTH_ACTIONS = {
  LOGIN_START: "LOGIN_START",
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILURE: "LOGIN_FAILURE",
  LOGOUT: "LOGOUT",
  SET_LOADING: "SET_LOADING",
  CLEAR_ERROR: "CLEAR_ERROR",
  UPDATE_USER: "UPDATE_USER",
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return { ...state, isLoading: true, error: null };
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        isLoading: false,
        user: action.payload.user,
        token: action.payload.token,
      };
    case AUTH_ACTIONS.LOGIN_FAILURE:
      return { ...state, isLoading: false, error: action.payload };
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isLoading: false,
        error: null,
      };
    case AUTH_ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case AUTH_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };
    case AUTH_ACTIONS.UPDATE_USER:
      return { ...state, user: action.payload };
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// AuthProvider
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check token on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const response = await authAPI.verifyToken();
          dispatch({
            type: AUTH_ACTIONS.LOGIN_SUCCESS,
            payload: { user: response.data.user, token },
          });
        } catch (error) {
          localStorage.removeItem("token");
          dispatch({ type: AUTH_ACTIONS.LOGOUT });
          console.error("Token verification failed:", error);
        }
      } else {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    };
    checkAuth();
  }, []);

  // Login function
  const login = async (credentials) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });
    try {
      const response = await authAPI.login(credentials);
      const { user, token } = response.data;

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user, token },
      });

      localStorage.setItem("token", token);
      toast.success(`Welcome back, ${user.role}!`);
      return { success: true };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || error.message || "Login failed";
      dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE, payload: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem("token");
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
  };
  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData);

      dispatch({
        type: AUTH_ACTIONS.UPDATE_USER,
        payload: response.data.user,
      });

      toast.success("Profile updated successfully");
      return { success: true };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Profile update failed";
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Change password
  const changePassword = async (passwordData) => {
    try {
      await authAPI.changePassword(passwordData);
      toast.success("Password changed successfully");
      return { success: true };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Password change failed";
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Get current user role
  const getRole = () => state.user?.role || null;

  // Context values
  const values = {
    user: state.user,
    token: state.token,
    hostelDetails: state.user?.assignedHostel || null,
    hostelType: state.user?.assignedHostel?.type || null,
    role: state.user?.role || null,
    loading: state.isLoading,
    error: state.error,
    login,
    logout,
    getRole,
    changePassword,
    updateProfile,
  };

  return <AuthContext.Provider value={values}>{children}</AuthContext.Provider>;
};

// Custom hook
export const useAuth = () => useContext(AuthContext);

export default AuthContext;
