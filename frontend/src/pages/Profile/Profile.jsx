import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useForm } from "react-hook-form";
import { User, Mail, Phone, MapPin, Lock, Save, Calendar, Shield, CheckCircle } from "lucide-react";
import LoadingSpinner from "../../components/UI/LoadingSpinner";

const Profile = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm({
    defaultValues: {
      name: user?.name || "",
      phone: user?.phone || "",
      address: user?.address || "",
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm();

  const onProfileSubmit = async (data) => {
    setIsLoading(true);
    await updateProfile(data);
    setIsLoading(false);
  };

  const onPasswordSubmit = async (data) => {
    setIsLoading(true);
    const result = await changePassword(data);
    if (result.success) {
      resetPassword();
    }
    setIsLoading(false);
  };

  const tabs = [
    { id: "profile", name: "Profile Information", icon: User },
    { id: "security", name: "Security", icon: Lock },
  ];

  const TabButton = ({ tab }) => (
    <button
      onClick={() => setActiveTab(tab.id)}
      className={`flex items-center px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-300 transform ${
        activeTab === tab.id
          ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md scale-105"
          : "text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 hover:scale-105"
      }`}
    >
      <tab.icon className="h-3 w-3 mr-1" />
      {tab.name}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-xl shadow-lg border border-indigo-100 p-4">
        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
            <User className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {user?.name}
            </h2>
            <p className="text-gray-600 flex items-center mt-1 text-sm">
              <Mail className="h-3 w-3 mr-1 text-indigo-500" />
              {user?.email}
            </p>
            <p className="text-xs text-gray-500 capitalize mt-1 flex items-center">
              <Shield className="h-3 w-3 mr-1 text-indigo-500" />
              {user?.role} • 
              <Calendar className="h-3 w-3 ml-1 mr-1 text-indigo-500" />
              Joined{" "}
              {user?.joinDate
                ? new Date(user.joinDate).toLocaleDateString()
                : "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <div className="flex space-x-2">
            {tabs.map((tab) => (
              <TabButton key={tab.id} tab={tab} />
            ))}
          </div>
        </div>

        <div className="p-4">
          {/* Profile Information Tab */}
          {activeTab === "profile" && (
            <form
              onSubmit={handleProfileSubmit(onProfileSubmit)}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-group">
                  <label className="form-label flex items-center text-gray-700 font-semibold text-sm">
                    <User className="h-4 w-4 mr-2 text-indigo-500" />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    {...registerProfile("name", {
                      required: "Name is required",
                    })}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 hover:border-gray-300 text-sm"
                    placeholder="Enter your full name"
                  />
                  {profileErrors.name && (
                    <p className="form-error text-red-500 text-xs mt-1 flex items-center">
                      <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                      {profileErrors.name.message}
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label flex items-center text-gray-700 font-semibold text-sm">
                    <Mail className="h-4 w-4 mr-2 text-indigo-500" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={user?.email}
                    disabled
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg bg-gray-50 cursor-not-allowed text-gray-500 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1 flex items-center">
                    <Lock className="h-3 w-3 mr-1" />
                    Email cannot be changed
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label flex items-center text-gray-700 font-semibold text-sm">
                    <Phone className="h-4 w-4 mr-2 text-indigo-500" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    {...registerProfile("phone")}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 hover:border-gray-300 text-sm"
                    placeholder="Enter your phone number"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label flex items-center text-gray-700 font-semibold text-sm">
                    <Shield className="h-4 w-4 mr-2 text-indigo-500" />
                    Role
                  </label>
                  <input
                    type="text"
                    value={user?.role}
                    disabled
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg bg-gray-50 cursor-not-allowed text-gray-500 capitalize text-sm"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label flex items-center text-gray-700 font-semibold text-sm">
                  <MapPin className="h-4 w-4 mr-2 text-indigo-500" />
                  Address
                </label>
                <textarea
                  {...registerProfile("address")}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 hover:border-gray-300 resize-none text-sm"
                  rows={2}
                  placeholder="Enter your address"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center px-6 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:scale-105 transform transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm"
                >
                  {isLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="space-y-8">
              <div className="bg-gradient-to-br from-red-50 via-white to-orange-50 rounded-xl shadow-md border border-red-100 p-4">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <Lock className="h-5 w-5 mr-2 text-red-500" />
                  Change Password
                </h3>
                <form
                  onSubmit={handlePasswordSubmit(onPasswordSubmit)}
                  className="space-y-4"
                >
                  <div className="form-group">
                    <label className="form-label flex items-center text-gray-700 font-semibold text-sm">
                      <Lock className="h-4 w-4 mr-2 text-red-500" />
                      Current Password *
                    </label>
                    <input
                      type="password"
                      {...registerPassword("currentPassword", {
                        required: "Current password is required",
                      })}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 hover:border-gray-300 text-sm"
                      placeholder="Enter your current password"
                    />
                    {passwordErrors.currentPassword && (
                      <p className="form-error text-red-500 text-xs mt-1 flex items-center">
                        <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                        {passwordErrors.currentPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label flex items-center text-gray-700 font-semibold text-sm">
                      <Lock className="h-4 w-4 mr-2 text-red-500" />
                      New Password *
                    </label>
                    <input
                      type="password"
                      {...registerPassword("newPassword", {
                        required: "New password is required",
                        minLength: {
                          value: 6,
                          message: "Password must be at least 6 characters",
                        },
                      })}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 hover:border-gray-300 text-sm"
                      placeholder="Enter your new password"
                    />
                    {passwordErrors.newPassword && (
                      <p className="form-error text-red-500 text-xs mt-1 flex items-center">
                        <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                        {passwordErrors.newPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label flex items-center text-gray-700 font-semibold text-sm">
                      <CheckCircle className="h-4 w-4 mr-2 text-red-500" />
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      {...registerPassword("confirmPassword", {
                        required: "Please confirm your password",
                        validate: (value, { newPassword }) =>
                          value === newPassword || "Passwords do not match",
                      })}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 hover:border-gray-300 text-sm"
                      placeholder="Confirm your new password"
                    />
                    {passwordErrors.confirmPassword && (
                      <p className="form-error text-red-500 text-xs mt-1 flex items-center">
                        <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                        {passwordErrors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex items-center px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:scale-105 transform transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm"
                    >
                      {isLoading ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          Update Password
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-gradient-to-br from-green-50 via-white to-emerald-50 rounded-xl shadow-md border border-green-100 p-4">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-green-500" />
                  Account Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-xs text-gray-600 flex items-center mb-1">
                      <Calendar className="h-3 w-3 mr-1 text-green-500" />
                      Account Created
                    </div>
                    <div className="font-semibold text-gray-900 text-sm">
                      {user?.joinDate
                        ? new Date(user.joinDate).toLocaleDateString()
                        : "N/A"}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-xs text-gray-600 flex items-center mb-1">
                      <Calendar className="h-3 w-3 mr-1 text-green-500" />
                      Last Login
                    </div>
                    <div className="font-semibold text-gray-900 text-sm">
                      {user?.lastLogin
                        ? new Date(user.lastLogin).toLocaleDateString()
                        : "N/A"}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-xs text-gray-600 flex items-center mb-1">
                      <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                      Account Status
                    </div>
                    <div className="font-semibold text-green-600 flex items-center text-sm">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                      Active
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-xs text-gray-600 flex items-center mb-1">
                      <Shield className="h-3 w-3 mr-1 text-green-500" />
                      Role
                    </div>
                    <div className="font-semibold text-gray-900 capitalize text-sm">
                      {user?.role}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
