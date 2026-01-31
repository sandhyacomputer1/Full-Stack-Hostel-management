import React, { createContext, useContext, useReducer, useEffect } from "react";
import { parentAPI } from "../services/api";
import toast from "react-hot-toast";

const initialState = {
    parent: null, // { phone, children: [...] }
    token: null,
    isLoading: true,
    error: null,
};

// Action types
const PARENT_AUTH_ACTIONS = {
    LOGIN_START: "LOGIN_START",
    LOGIN_SUCCESS: "LOGIN_SUCCESS",
    LOGIN_FAILURE: "LOGIN_FAILURE",
    LOGOUT: "LOGOUT",
    SET_LOADING: "SET_LOADING",
    CLEAR_ERROR: "CLEAR_ERROR",
};

// Reducer
const parentAuthReducer = (state, action) => {
    switch (action.type) {
        case PARENT_AUTH_ACTIONS.LOGIN_START:
            return { ...state, isLoading: true, error: null };
        case PARENT_AUTH_ACTIONS.LOGIN_SUCCESS:
            return {
                ...state,
                isLoading: false,
                parent: action.payload.parent,
                token: action.payload.token,
            };
        case PARENT_AUTH_ACTIONS.LOGIN_FAILURE:
            return { ...state, isLoading: false, error: action.payload };
        case PARENT_AUTH_ACTIONS.LOGOUT:
            return {
                ...state,
                parent: null,
                token: null,
                isLoading: false,
                error: null,
            };
        case PARENT_AUTH_ACTIONS.SET_LOADING:
            return { ...state, isLoading: action.payload };
        case PARENT_AUTH_ACTIONS.CLEAR_ERROR:
            return { ...state, error: null };
        default:
            return state;
    }
};

// Create context
const ParentAuthContext = createContext();

// ParentAuthProvider
export const ParentAuthProvider = ({ children }) => {
    const [state, dispatch] = useReducer(parentAuthReducer, initialState);

    // Check token on app load
    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem("parentToken");
            const parentData = localStorage.getItem("parentData");

            if (token && parentData) {
                try {
                    const parent = JSON.parse(parentData);
                    dispatch({
                        type: PARENT_AUTH_ACTIONS.LOGIN_SUCCESS,
                        payload: { parent, token },
                    });
                } catch (error) {
                    localStorage.removeItem("parentToken");
                    localStorage.removeItem("parentData");
                    dispatch({ type: PARENT_AUTH_ACTIONS.LOGOUT });
                }
            }

            dispatch({ type: PARENT_AUTH_ACTIONS.SET_LOADING, payload: false });
        };

        checkAuth();
    }, []);

    // Request OTP
    const requestOTP = async (phone) => {
        try {
            const response = await parentAPI.requestOTP(phone);
            toast.success(response.data.message);
            return { success: true };
        } catch (error) {
            const errorMessage =
                error.response?.data?.message || "Failed to send OTP";
            toast.error(errorMessage);
            return { success: false, error: errorMessage };
        }
    };

    // Verify OTP and login
    const verifyOTP = async (phone, otp) => {
        dispatch({ type: PARENT_AUTH_ACTIONS.LOGIN_START });
        try {
            const response = await parentAPI.verifyOTP(phone, otp);
            const { parent, token } = response.data;

            dispatch({
                type: PARENT_AUTH_ACTIONS.LOGIN_SUCCESS,
                payload: { parent, token },
            });

            localStorage.setItem("parentToken", token);
            localStorage.setItem("parentData", JSON.stringify(parent));

            toast.success("Login successful!");
            return { success: true };
        } catch (error) {
            const errorMessage =
                error.response?.data?.message || "OTP verification failed";
            dispatch({
                type: PARENT_AUTH_ACTIONS.LOGIN_FAILURE,
                payload: errorMessage,
            });
            toast.error(errorMessage);
            return { success: false, error: errorMessage };
        }
    };

    // Logout
    const logout = () => {
        localStorage.removeItem("parentToken");
        localStorage.removeItem("parentData");
        dispatch({ type: PARENT_AUTH_ACTIONS.LOGOUT });
        toast.success("Logged out successfully");
    };

    // Context values
    const values = {
        parent: state.parent,
        token: state.token,
        loading: state.isLoading,
        error: state.error,
        children: state.parent?.children || [],
        requestOTP,
        verifyOTP,
        logout,
    };

    return (
        <ParentAuthContext.Provider value={values}>
            {children}
        </ParentAuthContext.Provider>
    );
};

// Custom hook
export const useParentAuth = () => useContext(ParentAuthContext);

export default ParentAuthContext;
