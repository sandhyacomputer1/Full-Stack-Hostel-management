import React, { useState } from "react";
import { Users, UserPlus, List, Eye, DollarSign } from "lucide-react";
import AddEmployeeTab from "../../components/Employees/AddEmployeeTab";
import EditEmployeeTab from "../../components/Employees/EditEmployeeTab";
import EmployeeListTab from "../../components/Employees/EmployeeListTab";
import EmployeeDetailsModal from "../../components/Employees/EmployeeDetailsModal";
import SalaryTab from "../../components/Employees/SalaryTab"; // ✅ Add this import

const EmployeesPage = () => {
  const [activeTab, setActiveTab] = useState("list");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const handleAddSuccess = () => {
    setActiveTab("list");
  };

  const handleEditSuccess = () => {
    setActiveTab("list");
    setSelectedEmployee(null);
  };

  const handleEdit = (employee) => {
    setSelectedEmployee(employee);
    setActiveTab("edit");
    setShowDetailsModal(false);
  };

  const handleViewDetails = (employee) => {
    setSelectedEmployee(employee);
    setShowDetailsModal(true);
  };

  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSelectedEmployee(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-primary-100 rounded-xl">
              <Users className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Employee Management
              </h1>
              <p className="text-gray-600 mt-1">
                Manage staff, attendance, leaves, and payroll
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("list")}
              className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-all duration-200 transform hover:scale-105 ${
                activeTab === "list"
                  ? "border-primary-600 text-primary-600 bg-primary-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <List className="w-4 h-4" />
              <span>All Employees</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("add");
                setSelectedEmployee(null);
              }}
              className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-all duration-200 transform hover:scale-105 ${
                activeTab === "add"
                  ? "border-primary-600 text-primary-600 bg-primary-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New</span>
            </button>

            {/*  Salary Management Tab */}
            <button
              onClick={() => {
                setActiveTab("salary");
                setSelectedEmployee(null);
              }}
              className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-all duration-200 transform hover:scale-105 ${
                activeTab === "salary"
                  ? "border-primary-600 text-primary-600 bg-primary-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Salary Management</span>
            </button>

            {activeTab === "edit" && selectedEmployee && (
              <button className="pb-4 px-1 border-b-2 border-primary-600 text-primary-600 font-medium text-sm flex items-center space-x-2">
                <Eye className="w-4 h-4" />
                <span>Edit: {selectedEmployee.fullName}</span>
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {activeTab === "list" && (
          <EmployeeListTab
            onAddNew={() => setActiveTab("add")}
            onEdit={handleEdit}
            onViewDetails={handleViewDetails}
          />
        )}

        {activeTab === "add" && <AddEmployeeTab onSuccess={handleAddSuccess} />}

        {/* ✅ NEW: Salary Tab Content */}
        {activeTab === "salary" && <SalaryTab />}

        {activeTab === "edit" && selectedEmployee && (
          <EditEmployeeTab
            employee={selectedEmployee}
            onSuccess={handleEditSuccess}
            onCancel={() => {
              setActiveTab("list");
              setSelectedEmployee(null);
            }}
          />
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedEmployee && (
        <EmployeeDetailsModal
          isOpen={showDetailsModal}
          onClose={handleCloseDetails}
          employeeId={selectedEmployee._id}
          onEdit={handleEdit}
        />
      )}
    </div>
  );
};

export default EmployeesPage;
