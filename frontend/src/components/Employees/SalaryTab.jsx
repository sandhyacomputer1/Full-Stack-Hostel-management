// src/components/employee/SalaryTab.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  DollarSign,
  Calendar,
  Download,
  FileText,
  Search,
  Filter,
  RefreshCw,
  Calculator,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle,
  TrendingUp,
  Users,
  Clock,
  Edit,
  Link,
  History,
  X,
} from "lucide-react";
import { employeeSalaryAPI, employeesAPI } from "../../services/api";
import toast from "react-hot-toast";

function getCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

const SalaryTab = () => {
  const { hostelDetails } = useAuth();
  
  // State Management
  const [activeSubTab, setActiveSubTab] = useState("pending");
  const [salaries, setSalaries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showCalculateModal, setShowCalculateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false); // ✅ NEW
  const [showEditModal, setShowEditModal] = useState(false); // ✅ NEW
  const [selectedSalary, setSelectedSalary] = useState(null);

  // Calculate Form
  const [calculateForm, setCalculateForm] = useState({
    month: getCurrentMonth(),
    employeeId: "",
    calculateAll: false,
  });

  // Payment Form
  const [paymentForm, setPaymentForm] = useState({
    paymentMode: "bank_transfer",
    transactionId: "",
    paymentProof: null,
    notes: "",
    addToExpense: true, // ✅ Auto-add to expenses
  });

  // ✅ NEW: Edit Form
  const [editForm, setEditForm] = useState({
    bonuses: [],
    otherDeductions: [],
    reason: "",
  });

  // Stats
  const [stats, setStats] = useState({
    totalPending: 0,
    totalPendingAmount: 0,
    totalPaid: 0,
    totalPaidAmount: 0,
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (activeSubTab === "pending") {
      fetchPendingSalaries();
    } else if (activeSubTab === "paid") {
      fetchPaidSalaries();
    }
  }, [activeSubTab]);

  const fetchEmployees = async () => {
    try {
      const response = await employeesAPI.getAll({ status: "ACTIVE" });
      let employeesList = [];
      if (response.data?.employees) {
        employeesList = response.data.employees;
      } else if (response.data?.data) {
        employeesList = response.data.data;
      } else if (Array.isArray(response.data)) {
        employeesList = response.data;
      }
      setEmployees(employeesList);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
    }
  };

  const fetchPendingSalaries = async () => {
    try {
      setLoading(true);
      const response = await employeeSalaryAPI.getPending();
      const data = response.data?.data || response.data || [];
      setSalaries(data);

      const totalAmount = data.reduce((sum, s) => sum + (s.netSalary || 0), 0);
      setStats((prev) => ({
        ...prev,
        totalPending: data.length,
        totalPendingAmount: totalAmount,
      }));
    } catch (error) {
      console.error("Error fetching pending salaries:", error);
      toast.error("Failed to load pending salaries");
    } finally {
      setLoading(false);
    }
  };

  const fetchPaidSalaries = async () => {
    try {
      setLoading(true);
      const month = calculateForm.month;
      const response = await employeeSalaryAPI.getMonthlyPayroll(month);
      const data = response.data?.data || response.data || [];
      setSalaries(data);

      const paidData = data.filter((s) => s.isPaid);
      const totalAmount = paidData.reduce(
        (sum, s) => sum + (s.netSalary || 0),
        0
      );
      setStats((prev) => ({
        ...prev,
        totalPaid: paidData.length,
        totalPaidAmount: totalAmount,
      }));
    } catch (error) {
      console.error("Error fetching paid salaries:", error);
      toast.error("Failed to load paid salaries");
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateSalary = async () => {
    if (!calculateForm.month) {
      toast.error("Please select a month");
      return;
    }

    if (!calculateForm.calculateAll && !calculateForm.employeeId) {
      toast.error("Please select an employee or choose Calculate All");
      return;
    }

    try {
      setProcessing(true);
      const [year, month] = calculateForm.month.split("-");

      if (calculateForm.calculateAll) {
        const response = await employeeSalaryAPI.bulkCalculate({
          month: calculateForm.month,
          year: parseInt(year),
        });
        toast.success(
          `Calculated salary for ${response.data?.data?.length || 0} employees`
        );
      } else {
        await employeeSalaryAPI.calculate({
          employeeId: calculateForm.employeeId,
          month: calculateForm.month,
          year: parseInt(year),
        });
        toast.success("Salary calculated successfully");
      }

      setShowCalculateModal(false);
      resetCalculateForm();
      fetchPendingSalaries();
    } catch (error) {
      console.error("Error calculating salary:", error);
      const errorMsg =
        error.response?.data?.message || "Failed to calculate salary";
      toast.error(errorMsg);
    } finally {
      setProcessing(false);
    }
  };

  // UPDATED: Pay salary with FormData and expense integration
  const handlePaySalary = async (e) => {
    e.preventDefault();

    if (!selectedSalary) return;
    if (!paymentForm.paymentMode) {
      toast.error("Please select payment mode");
      return;
    }

    try {
      setProcessing(true);

      const formData = new FormData();
      formData.append("paymentMode", paymentForm.paymentMode);
      formData.append("transactionId", paymentForm.transactionId || "");
      formData.append("notes", paymentForm.notes || "");
      formData.append("addToExpense", paymentForm.addToExpense.toString()); // Send as string

      if (paymentForm.paymentProof) {
        formData.append("paymentProof", paymentForm.paymentProof);
      }

      console.log(
        "Paying salary with expense flag:",
        paymentForm.addToExpense
      );

      const response = await employeeSalaryAPI.pay(
        selectedSalary._id,
        formData
      );

      if (response.data?.expenseCreated) {
        toast.success("Salary paid and added to expenses!");
      } else if (paymentForm.addToExpense) {
        toast.success(
          "Salary paid! (Note: Expense record may not have been created)",
          {
            duration: 4000,
          }
        );
      } else {
        toast.success("Salary paid successfully!");
      }

      setShowPayModal(false);
      setSelectedSalary(null);
      resetPaymentForm();
      fetchPendingSalaries();
    } catch (error) {
      console.error("Error paying salary:", error);
      const errorMsg =
        error.response?.data?.message || "Failed to process payment";
      toast.error(errorMsg);
    } finally {
      setProcessing(false);
    }
  };

  // NEW: Handle expense link toggle (for paid salaries)
  const handleToggleExpense = async (salaryId, shouldAdd) => {
    try {
      const response = await employeeSalaryAPI.updateExpenseLink(salaryId, {
        addToExpense: shouldAdd,
      });

      if (shouldAdd) {
        toast.success("Expense record created successfully!");
      } else {
        toast.success("Expense link removed successfully!");
      }

      // Refresh data
      if (activeSubTab === "paid") {
        fetchPaidSalaries();
      }
    } catch (error) {
      console.error("Error toggling expense:", error);
      toast.error(
        error.response?.data?.message || "Failed to update expense link"
      );
    }
  };

  // NEW: Handle salary edit
  const handleEditSalary = async (e) => {
    e.preventDefault();

    if (!editForm.reason) {
      toast.error("Please provide a reason for editing");
      return;
    }

    try {
      setProcessing(true);

      const changes = {
        bonuses: editForm.bonuses,
        otherDeductions: editForm.otherDeductions,
      };

      await employeeSalaryAPI.edit(selectedSalary._id, {
        changes,
        reason: editForm.reason,
      });

      toast.success("Salary record updated successfully!");
      setShowEditModal(false);
      setSelectedSalary(null);
      resetEditForm();
      fetchPendingSalaries();
    } catch (error) {
      console.error("Error editing salary:", error);
      toast.error(error.response?.data?.message || "Failed to edit salary");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadPayslip = async (salaryId) => {
    try {
      toast.loading("Generating payslip...");
      
      // Find salary record to get employee name and all data
      const salaryRecord = salaries.find(s => s._id === salaryId);
      const employeeName = salaryRecord?.employee?.fullName || 'Unknown Employee';
      
      // Clean employee name for filename (remove special characters)
      const cleanEmployeeName = employeeName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      
      console.log(`Downloading payslip for ${employeeName} (ID: ${salaryId})`);
      console.log('Salary record found:', salaryRecord);
      console.log('Hostel details from AuthContext:', hostelDetails);
      
      // Make API call
      const response = await employeeSalaryAPI.getSlip(salaryId);
      
      console.log('Payslip API response:', response);
      
      // Check if response data is valid
      if (!response.data) {
        throw new Error("Empty response received from server");
      }
      
      // Check if response is actual PDF data or JSON data
      const responseType = response.headers?.['content-type'] || '';
      console.log('Response Content-Type:', responseType);
      
      if (responseType.includes('application/pdf')) {
        // This is actual PDF data - proceed with download
        console.log('Received PDF data - proceeding with download');
        
        // Create blob with proper MIME type for PDF
        const blob = new Blob([response.data], { type: 'application/pdf' });
        console.log('Blob created:', blob);
        console.log('Blob size:', blob.size);
        
        const url = window.URL.createObjectURL(blob);
        console.log('Object URL created:', url);
        
        // Create download link
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `${cleanEmployeeName}_payslip.pdf`);
        link.style.display = 'none';
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        
        console.log('Download triggered');
        
        // Cleanup
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          console.log('Cleanup completed');
        }, 100);
        
        toast.success(`Payslip downloaded for ${employeeName}!`);
      } else {
        // This is JSON data - open as HTML instead
        console.log('Received JSON data - opening as HTML payslip');
        
        // Use salary record data directly since we have it
        const payslipData = salaryRecord || response.data.data || response.data;
        console.log('Using payslip data:', payslipData);
        
        const htmlContent = generatePayslipHTML(payslipData, employeeName, hostelDetails);
        
        // Open in new window
        const newWindow = window.open('', '_blank', 'width=420,height=700,scrollbars=yes,resizable=yes');
        if (newWindow) {
          newWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Payment Receipt - ${employeeName}</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                @page {
                  size: A4;
                  margin: 20mm;
                }
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                body {
                  font-family: 'Times New Roman', serif;
                  background: #f5f5f5;
                  padding: 10px;
                  font-size: 12px;
                  line-height: 1.4;
                }
                .receipt-container {
                  max-width: 210mm;
                  margin: 0 auto;
                  background: white;
                  padding: 15mm;
                  border: 1px solid #333;
                  box-shadow: 0 0 10px rgba(0,0,0,0.1);
                  min-height: 297mm;
                }
                .receipt-header {
                  text-align: center;
                  border-bottom: 2px solid #333;
                  padding-bottom: 15px;
                  margin-bottom: 20px;
                }
                .receipt-header h2 {
                  font-size: 20px;
                  font-weight: bold;
                  margin-bottom: 5px;
                  text-transform: uppercase;
                  letter-spacing: 2px;
                }
                .receipt-header .subtitle {
                  font-size: 12px;
                  color: #666;
                  margin-top: 5px;
                }
                .hostel-info {
                  margin-top: 8px;
                  padding-top: 8px;
                  border-top: 1px solid #333;
                }
                .hostel-name {
                  font-size: 12px;
                  font-weight: 600;
                  margin-bottom: 2px;
                }
                .hostel-address {
                  font-size: 10px;
                  color: #666;
                }
                .hostel-contact {
                  font-size: 10px;
                  color: #666;
                  margin-top: 2px;
                }
                .receipt-body {
                  padding: 10px;
                }
                .info-row {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 6px;
                  padding-bottom: 6px;
                  border-bottom: 1px dotted #ccc;
                }
                .info-row:last-child {
                  border-bottom: none;
                  margin-bottom: 0;
                  padding-bottom: 0;
                }
                .label {
                  font-weight: 600;
                  color: #333;
                  flex: 1;
                  font-size: 11px;
                }
                .value {
                  font-weight: 500;
                  color: #333;
                  text-align: right;
                  flex: 1;
                  font-size: 11px;
                }
                .total-row {
                  display: flex;
                  justify-content: space-between;
                  margin: 12px 0;
                  padding: 8px 12px;
                  background: #f8f9fa;
                  border-top: 2px solid #333;
                  border-bottom: 2px solid #333;
                }
                .total-label {
                  font-weight: 700;
                  color: #333;
                  font-size: 12px;
                }
                .total-value {
                  font-weight: 700;
                  color: #333;
                  font-size: 12px;
                  text-align: right;
                }
                .status-paid {
                  background: #28a745;
                  color: white;
                  padding: 2px 6px;
                  border-radius: 3px;
                  font-weight: bold;
                  font-size: 10px;
                  text-transform: uppercase;
                }
                .status-pending {
                  background: #ffc107;
                  color: #333;
                  padding: 2px 6px;
                  border-radius: 3px;
                  font-weight: bold;
                  font-size: 10px;
                  text-transform: uppercase;
                }
                .footer {
                  text-align: center;
                  padding: 10px;
                  background: #f8f9fa;
                  border-top: 1px solid #333;
                  font-size: 10px;
                  color: #666;
                }
                .print-btn { 
                  position: fixed; 
                  top: 10px; 
                  right: 10px; 
                  padding: 8px 12px; 
                  background: #333; 
                  color: white; 
                  border: none; 
                  border-radius: 5px; 
                  cursor: pointer; 
                  font-weight: bold;
                  font-size: 12px;
                  z-index: 1000;
                }
                .print-btn:hover {
                  background: #555;
                }
                @media print {
                  body { 
                    background: white; 
                    padding: 0;
                  }
                  .receipt-container { 
                    box-shadow: none; 
                    border: 1px solid #333;
                    margin: 0;
                    padding: 15mm;
                  }
                  .print-btn { 
                    display: none; 
                  }
                }
                @media (max-width: 768px) {
                  body {
                    padding: 5px;
                  }
                  .receipt-container {
                    padding: 10mm;
                    min-height: auto;
                  }
                  .receipt-header h2 {
                    font-size: 18px;
                  }
                  .receipt-header .subtitle {
                    font-size: 11px;
                  }
                  .info-row {
                    flex-direction: column;
                    gap: 2px;
                  }
                  .label, .value {
                    text-align: left;
                    font-size: 10px;
                  }
                  .total-row {
                    flex-direction: column;
                    gap: 5px;
                    text-align: center;
                  }
                }
              </style>
            </head>
            <body>
              <button class="print-btn" onclick="window.print()">🖨️ Print</button>
              ${htmlContent}
            </body>
            </html>
          `);
          newWindow.document.close();
          
          toast.success(`Payment receipt opened for ${employeeName}! Use browser print to save as PDF.`);
        } else {
          toast.error("Popup blocked! Please allow popups for this site.");
        }
      }
    } catch (error) {
      console.error("Error downloading payslip:", error);
      
      // Better error handling for different error types
      let errorMessage = "Failed to download payslip";
      
      if (error.response) {
        // Server responded with error status
        console.error('Server error:', error.response.status, error.response.data);
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        // Request was made but no response received
        console.error('No response received:', error.request);
        errorMessage = "No response from server. Please check your internet connection.";
      } else if (error.message) {
        // Other error (network, CORS, etc.)
        console.error('Network/other error:', error.message);
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  };

  // Helper function to generate HTML payslip from JSON data
  const generatePayslipHTML = (data, employeeName, hostelDetails) => {
    return `
      <div class="receipt-container">
        <div class="receipt-header">
          <h2>PAYMENT RECEIPT</h2>
          <div class="subtitle">${employeeName}</div>
          ${hostelDetails?.name || hostelDetails?.address ? `
            <div class="hostel-info">
              ${hostelDetails?.name ? `
                <div class="hostel-name">${hostelDetails.name}</div>
              ` : ''}
              ${hostelDetails?.address ? `
                <div class="hostel-address">${hostelDetails.address}</div>
              ` : ''}
              ${hostelDetails?.ownerName ? `
                <div class="hostel-contact">Owner: ${hostelDetails.ownerName}</div>
              ` : ''}
              ${hostelDetails?.ownerMobile ? `
                <div class="hostel-contact">Mobile: ${hostelDetails.ownerMobile}</div>
              ` : ''}
            </div>
          ` : ''}
        </div>
        
        <div class="receipt-body">
          <div class="info-row">
            <span class="label">Employee Name:</span>
            <span class="value">${data.employee?.fullName || employeeName}</span>
          </div>
          <div class="info-row">
            <span class="label">Employee Code:</span>
            <span class="value">${data.employee?.employeeCode || "N/A"}</span>
          </div>
          <div class="info-row">
            <span class="label">Department:</span>
            <span class="value">${data.employee?.department || "N/A"}</span>
          </div>
          <div class="info-row">
            <span class="label">Role:</span>
            <span class="value">${data.employee?.role || "N/A"}</span>
          </div>
          <div class="info-row">
            <span class="label">Month:</span>
            <span class="value">${data.month || "N/A"}</span>
          </div>
          <div class="info-row">
            <span class="label">Year:</span>
            <span class="value">${data.year || "N/A"}</span>
          </div>
          <div class="info-row">
            <span class="label">Working Days:</span>
            <span class="value">${data.attendance?.totalWorkingDays || data.totalWorkingDays || "0"}</span>
          </div>
          <div class="info-row">
            <span class="label">Present Days:</span>
            <span class="value">${data.attendance?.presentDays || data.presentDays || "0"}</span>
          </div>
          <div class="info-row">
            <span class="label">Basic Salary:</span>
            <span class="value">₹${(data.baseSalary || 0).toLocaleString("en-IN")}</span>
          </div>
          ${data.bonuses?.totalBonuses > 0 || data.totalBonuses > 0 ? `
            <div class="info-row">
              <span class="label">Total Bonuses:</span>
              <span class="value">₹${(data.bonuses?.totalBonuses || data.totalBonuses || 0).toLocaleString("en-IN")}</span>
            </div>
          ` : ''}
          <div class="info-row">
            <span class="label">Total Deductions:</span>
            <span class="value">₹${(data.deductions?.totalDeductions || data.totalDeductions || 0).toLocaleString("en-IN")}</span>
          </div>
          
          <div class="total-row">
            <span class="total-label">Net Salary:</span>
            <span class="total-value">₹${(data.summary?.netSalary || data.netSalary || 0).toLocaleString("en-IN")}</span>
          </div>
          
          <div class="info-row">
            <span class="label">Payment Status:</span>
            <span class="value">
              ${data.isPaid || data.payment?.isPaid ? 
                `<span class="status-paid">Paid</span>` : 
                `<span class="status-pending">Pending</span>`
              }
            </span>
          </div>
          ${data.paidDate || data.payment?.paidDate ? `
            <div class="info-row">
              <span class="label">Payment Date:</span>
              <span class="value">${new Date(data.paidDate || data.payment.paidDate).toLocaleDateString("en-IN", { 
                year: "numeric", 
                month: "short", 
                day: "numeric" 
              })}</span>
            </div>
          ` : ''}
          ${data.paymentMode || data.payment?.paymentMode ? `
            <div class="info-row">
              <span class="label">Payment Mode:</span>
              <span class="value">${data.paymentMode || data.payment.paymentMode}</span>
            </div>
          ` : ''}
          ${data.transactionId || data.payment?.transactionId ? `
            <div class="info-row">
              <span class="label">Transaction ID:</span>
              <span class="value">${data.transactionId || data.payment.transactionId}</span>
            </div>
          ` : ''}
          ${data.paidBy?.name || data.payment?.paidBy?.name ? `
            <div class="info-row">
              <span class="label">Processed By:</span>
              <span class="value">${data.paidBy?.name || data.payment.paidBy?.name || "N/A"}</span>
            </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <p>Generated: ${new Date().toLocaleString("en-IN", { 
            year: "numeric", 
            month: "long", 
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          })}</p>
          <p>This is a computer-generated receipt. No signature required.</p>
        </div>
      </div>
    `;
  };

  const handleExportCSV = async () => {
    try {
      const response = await employeeSalaryAPI.exportCSV({
        month: calculateForm.month,
        status: activeSubTab === "paid" ? "paid" : "pending",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `salary-report-${calculateForm.month}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Report exported successfully");
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast.error("Failed to export report");
    }
  };

  const resetCalculateForm = () => {
    setCalculateForm({
      month: getCurrentMonth(),
      employeeId: "",
      calculateAll: false,
    });
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      paymentMode: "bank_transfer",
      transactionId: "",
      paymentProof: null,
      notes: "",
      addToExpense: true,
    });
  };

  // NEW: Reset edit form
  const resetEditForm = () => {
    setEditForm({
      bonuses: [],
      otherDeductions: [],
      reason: "",
    });
  };

  // Action handlers for mobile and desktop views
  const onViewDetails = (salary) => {
    setSelectedSalary(salary);
    setShowDetailsModal(true);
  };

  const onViewBreakdown = (salary) => {
    setSelectedSalary(salary);
    setShowBreakdownModal(true);
  };

  const onPay = (salary) => {
    setSelectedSalary(salary);
    setShowPayModal(true);
  };

  const onEdit = (salary) => {
    setSelectedSalary(salary);
    setEditForm({
      bonuses: salary.bonuses || [],
      otherDeductions: salary.otherDeductions || [],
      reason: "",
    });
    setShowEditModal(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount || 0);
  };

  const formatMonth = (monthStr) => {
    if (!monthStr) return "-";
    const [year, month] = monthStr.split("-");
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
    });
  };

  const filteredSalaries = salaries.filter((salary) => {
    const matchesSearch =
      salary.employee?.fullName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      salary.employee?.employeeCode
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      salary.month?.includes(searchQuery);
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-1 sm:p-2 lg:p-4">
      {/* Header */}
      <div className="mb-3 sm:mb-4 lg:mb-6">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-1">
          Employee Salary Management
        </h1>
        <p className="text-xs sm:text-sm text-gray-600">
          Manage employee salaries, payments, and generate payslips
        </p>
      </div>

      {/* Stats Cards - Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 mb-3 sm:mb-4 lg:mb-6">
        {/* Pending Salaries Card */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 p-2 sm:p-3 lg:p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600 mb-1">Pending</p>
              <p className="text-base sm:text-lg lg:text-xl font-bold text-orange-600">
                {stats.totalPending}
              </p>
              <p className="text-xs text-gray-500">
                {formatCurrency(stats.totalPendingAmount)}
              </p>
            </div>
            <div className="p-1 sm:p-2 bg-orange-100 rounded-full hover:bg-orange-200 transition-colors duration-200">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Paid Salaries Card */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 p-2 sm:p-3 lg:p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600 mb-1">Paid</p>
              <p className="text-base sm:text-lg lg:text-xl font-bold text-green-600">
                {stats.totalPaid}
              </p>
              <p className="text-xs text-gray-500">
                {formatCurrency(stats.totalPaidAmount)}
              </p>
            </div>
            <div className="p-1 sm:p-2 bg-green-100 rounded-full hover:bg-green-200 transition-colors duration-200">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            </div>
          </div>
        </div>

        {/* Active Employees Card */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 p-2 sm:p-3 lg:p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600 mb-1">Employees</p>
              <p className="text-base sm:text-lg lg:text-xl font-bold text-blue-600">
                {employees.length}
              </p>
              <p className="text-xs text-gray-500">Active staff</p>
            </div>
            <div className="p-1 sm:p-2 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors duration-200">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Total Payroll Card */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 p-2 sm:p-3 lg:p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600 mb-1">Payroll</p>
              <p className="text-base sm:text-lg lg:text-xl font-bold text-purple-600">
                {formatCurrency(
                  stats.totalPendingAmount + stats.totalPaidAmount
                )}
              </p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="p-1 sm:p-2 bg-purple-100 rounded-full hover:bg-purple-200 transition-colors duration-200">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-md overflow-hidden">
        {/* Sub-Tab Navigation - Responsive */}
        <div className="border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:space-x-1 lg:space-x-6 px-1 sm:px-2 lg:px-4">
            <button
              onClick={() => setActiveSubTab("pending")}
              className={`flex-1 sm:flex-none py-2 px-1 sm:px-2 lg:px-4 border-b-2 font-medium text-xs sm:text-sm transition-all duration-200 rounded-t-lg hover:bg-gray-50 ${
                activeSubTab === "pending"
                  ? "border-orange-600 text-orange-600 bg-orange-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
              <span className="hidden sm:inline">Pending</span>
              <span className="sm:hidden">P</span>
            </button>
            <button
              onClick={() => setActiveSubTab("paid")}
              className={`flex-1 sm:flex-none py-2 px-1 sm:px-2 lg:px-4 border-b-2 font-medium text-xs sm:text-sm transition-all duration-200 rounded-t-lg hover:bg-gray-50 ${
                activeSubTab === "paid"
                  ? "border-green-600 text-green-600 bg-green-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
              <span className="hidden sm:inline">Paid</span>
              <span className="sm:hidden">✓</span>
            </button>
            <button
              onClick={() => setActiveSubTab("calculate")}
              className={`flex-1 sm:flex-none py-2 px-1 sm:px-2 lg:px-4 border-b-2 font-medium text-xs sm:text-sm transition-all duration-200 rounded-t-lg hover:bg-gray-50 ${
                activeSubTab === "calculate"
                  ? "border-blue-600 text-blue-600 bg-blue-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Calculator className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
              <span className="hidden sm:inline">Calculate</span>
              <span className="sm:hidden">+</span>
            </button>
          </div>
        </div>

        {/* Toolbar - Responsive */}
        <div className="p-2 sm:p-3 lg:p-4 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 sm:gap-3">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
              <div className="relative flex-1 sm:flex-none max-w-full sm:max-w-md lg:max-w-lg">
                <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 sm:pl-9 pr-3 py-1 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {activeSubTab === "paid" && (
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                  <input
                    type="month"
                    value={calculateForm.month}
                    onChange={(e) => {
                      setCalculateForm({
                        ...calculateForm,
                        month: e.target.value,
                      });
                      setTimeout(() => fetchPaidSalaries(), 100);
                    }}
                    className="px-1 sm:px-2 py-1 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1 sm:gap-2">
              <button
                onClick={() => {
                  if (activeSubTab === "pending") fetchPendingSalaries();
                  else if (activeSubTab === "paid") fetchPaidSalaries();
                }}
                disabled={loading}
                className="px-2 sm:px-3 py-1 sm:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center space-x-1 text-xs sm:text-sm font-medium transition-colors duration-200"
              >
                <RefreshCw
                  className={`w-3 h-3 sm:w-4 sm:h-4 ${loading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">↻</span>
              </button>

              {activeSubTab !== "calculate" && (
                <button
                  onClick={handleExportCSV}
                  className="px-2 sm:px-3 py-1 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center space-x-1 text-xs sm:text-sm font-medium transition-colors duration-200"
                >
                  <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Export</span>
                  <span className="sm:hidden">⬇</span>
                </button>
              )}

              {activeSubTab === "pending" && (
                <button
                  onClick={() => setShowCalculateModal(true)}
                  className="px-2 sm:px-3 py-1 sm:py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center space-x-1 text-xs sm:text-sm font-medium transition-colors duration-200"
                >
                  <Calculator className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Calculate</span>
                  <span className="sm:hidden">+</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-1 sm:p-2 lg:p-4">
          {activeSubTab === "calculate" ? (
            <CalculateTabContent
              employees={employees}
              calculateForm={calculateForm}
              setCalculateForm={setCalculateForm}
              handleCalculateSalary={handleCalculateSalary}
              processing={processing}
            />
          ) : (
            <div className="overflow-x-auto">
              {/* Mobile Card View */}
              <div className="block sm:hidden space-y-2">
                {filteredSalaries.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <div className="mb-3">
                      <FileText className="w-8 h-8 mx-auto text-gray-300" />
                    </div>
                    <p className="text-xs">No records found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {searchQuery ? "Try adjusting search" : "No records available"}
                    </p>
                  </div>
                ) : (
                  filteredSalaries.map((salary) => (
                    <div key={salary._id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow duration-200">
                      {/* Employee Info */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-xs">
                            {salary.employee?.fullName}
                          </h3>
                          <p className="text-xs text-gray-500">{salary.employee?.employeeCode}</p>
                          <p className="text-xs text-gray-500">{salary.employee?.department}</p>
                        </div>
                        <div className={`px-1 py-0.5 rounded-full text-xs font-medium ${
                          salary.isPaid 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {salary.isPaid ? 'Paid' : 'Pending'}
                        </div>
                      </div>

                      {/* Salary Details */}
                      <div className="grid grid-cols-2 gap-1 mb-2 text-xs">
                        <div>
                          <span className="text-gray-500">Month:</span>
                          <span className="ml-1 font-medium">{salary.month}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Net:</span>
                          <span className="ml-1 font-bold text-green-600">
                            {formatCurrency(salary.summary?.netSalary || salary.netSalary || 0)}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div className="flex space-x-1">
                          <button
                            onClick={() => onViewDetails(salary)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors duration-200"
                            title="View Details"
                          >
                            <Eye className="w-3 h-3" />
                          </button>

                          {!salary.isPaid && (
                            <>
                              <button
                                onClick={() => onViewBreakdown(salary)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors duration-200"
                                title="View Breakdown"
                              >
                                <Calculator className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => onEdit(salary)}
                                className="p-1 text-orange-600 hover:bg-orange-50 rounded transition-colors duration-200"
                                title="Edit Salary"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => onPay(salary)}
                                className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors duration-200"
                                title="Pay Salary"
                              >
                                <CheckCircle className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>

                        <button
                          onClick={() => onDownloadPayslip(salary._id)}
                          className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors duration-200"
                          title="Download Payslip"
                        >
                          <FileText className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block">
                {filteredSalaries.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="mb-3">
                      <FileText className="w-12 h-12 mx-auto text-gray-300" />
                    </div>
                    <p className="text-sm">No records found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {searchQuery ? "Try adjusting search" : "No records available"}
                    </p>
                  </div>
                ) : (
                  <SalaryTableContent
                    salaries={filteredSalaries}
                    loading={loading}
                    activeSubTab={activeSubTab}
                    onViewDetails={onViewDetails}
                    onViewBreakdown={onViewBreakdown}
                    onPay={onPay}
                    onEdit={onEdit}
                    onToggleExpense={handleToggleExpense}
                    onDownloadPayslip={handleDownloadPayslip}
                    formatCurrency={formatCurrency}
                    formatMonth={formatMonth}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCalculateModal && (
        <CalculateModal
          employees={employees}
          calculateForm={calculateForm}
          setCalculateForm={setCalculateForm}
          handleCalculateSalary={handleCalculateSalary}
          processing={processing}
          onClose={() => {
            setShowCalculateModal(false);
            resetCalculateForm();
          }}
        />
      )}

      {showBreakdownModal && selectedSalary && (
        <SalaryBreakdownModal
          salary={selectedSalary}
          formatCurrency={formatCurrency}
          formatMonth={formatMonth}
          onClose={() => {
            setShowBreakdownModal(false);
            setSelectedSalary(null);
          }}
          onProceedToPay={() => {
            setShowBreakdownModal(false);
            setShowPayModal(true);
          }}
        />
      )}

      {showPayModal && selectedSalary && (
        <PaymentModal
          salary={selectedSalary}
          paymentForm={paymentForm}
          setPaymentForm={setPaymentForm}
          handlePaySalary={handlePaySalary}
          processing={processing}
          formatCurrency={formatCurrency}
          onClose={() => {
            setShowPayModal(false);
            setSelectedSalary(null);
            resetPaymentForm();
          }}
        />
      )}

      {showEditModal && selectedSalary && (
        <EditSalaryModal
          salary={selectedSalary}
          editForm={editForm}
          setEditForm={setEditForm}
          handleEditSalary={handleEditSalary}
          processing={processing}
          formatCurrency={formatCurrency}
          onClose={() => {
            setShowEditModal(false);
            setSelectedSalary(null);
            resetEditForm();
          }}
        />
      )}

      {showDetailsModal && selectedSalary && (
        <DetailsModal
          salary={selectedSalary}
          formatCurrency={formatCurrency}
          formatMonth={formatMonth}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedSalary(null);
          }}
          onDownloadPayslip={handleDownloadPayslip}
        />
      )}
    </div>
  );
};

// ================== SUB-COMPONENTS ==================

const CalculateTabContent = ({
  employees,
  calculateForm,
  setCalculateForm,
  handleCalculateSalary,
  processing,
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    handleCalculateSalary();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <Calculator className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Calculate Employee Salaries
        </h3>
        <p className="text-gray-600">
          Calculate salaries for individual employees or bulk calculate for all
          active employees
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Month <span className="text-red-500">*</span>
          </label>
          <input
            type="month"
            value={calculateForm.month}
            onChange={(e) =>
              setCalculateForm({ ...calculateForm, month: e.target.value })
            }
            max={new Date().toISOString().slice(0, 7)}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={calculateForm.calculateAll}
              onChange={(e) =>
                setCalculateForm({
                  ...calculateForm,
                  calculateAll: e.target.checked,
                  employeeId: e.target.checked ? "" : calculateForm.employeeId,
                })
              }
              className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">
                Calculate for all active employees
              </span>
              <p className="text-xs text-gray-600 mt-1">
                This will calculate salaries for all employees who don't have
                salary calculated for the selected month
              </p>
            </div>
          </label>
        </div>

        {!calculateForm.calculateAll && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Employee <span className="text-red-500">*</span>
            </label>
            <select
              value={calculateForm.employeeId}
              onChange={(e) =>
                setCalculateForm({
                  ...calculateForm,
                  employeeId: e.target.value,
                })
              }
              required={!calculateForm.calculateAll}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select an employee</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.employeeCode} - {emp.fullName} - {emp.role}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Salary Calculation Process:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>System will fetch attendance records for the month</li>
                <li>Calculate working days, absents, and leave days</li>
                <li>
                  Apply prorated calculation if employee joined/left mid-month
                </li>
                <li>Apply deductions and add bonuses</li>
                <li>Generate final net salary</li>
              </ul>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={processing}
          className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {processing ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Calculating...</span>
            </>
          ) : (
            <>
              <Calculator className="w-5 h-5" />
              <span>Calculate Salary</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

const SalaryTableContent = ({
  salaries,
  loading,
  activeSubTab,
  onViewDetails,
  onViewBreakdown,
  onPay,
  onEdit,
  onToggleExpense,
  onDownloadPayslip,
  formatCurrency,
  formatMonth,
}) => {
  if (loading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Loading salary records...</p>
      </div>
    );
  }

  if (salaries.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">
          {activeSubTab === "pending"
            ? "No pending salary records found"
            : "No paid salary records found for selected month"}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Employee
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Month
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Working Days
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Attendance
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Base Salary
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Deductions
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Net Salary
            </th>
            {activeSubTab === "paid" && (
              <>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expense
                </th>
              </>
            )}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {salaries.map((salary) => (
            <tr key={salary._id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {salary.employee?.fullName}
                  </div>
                  <div className="text-sm text-gray-500">
                    {salary.employee?.employeeCode}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {formatMonth(salary.month)}
                </div>
                {salary.isProrated && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    Prorated
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {salary.totalWorkingDays}
                {salary.monthWorkingDays &&
                  salary.totalWorkingDays !== salary.monthWorkingDays && (
                    <span className="text-gray-500 text-xs ml-1">
                      / {salary.monthWorkingDays}
                    </span>
                  )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span className="text-green-600 font-medium">
                  {salary.presentDays}P
                </span>
                {salary.absentDays > 0 && (
                  <span className="text-red-600 ml-2">
                    {salary.absentDays}A
                  </span>
                )}
                {salary.halfDays > 0 && (
                  <span className="text-orange-600 ml-2">
                    {salary.halfDays}H
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {formatCurrency(salary.baseSalary)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                {formatCurrency(salary.totalDeductions)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                {formatCurrency(salary.netSalary)}
              </td>
              {activeSubTab === "paid" && (
                <>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {salary.paidDate
                      ? new Date(salary.paidDate).toLocaleDateString("en-IN")
                      : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {salary.isAddedToExpense ? (
                      <button
                        onClick={() => onToggleExpense(salary._id, false)}
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200"
                        title="Remove from expenses"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Added
                      </button>
                    ) : (
                      <button
                        onClick={() => onToggleExpense(salary._id, true)}
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
                        title="Add to expenses"
                      >
                        <Link className="w-3 h-3 mr-1" />
                        Add
                      </button>
                    )}
                  </td>
                </>
              )}
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex space-x-2">
                  {/* Always show View Details button */}
                  <button
                    onClick={() => onViewDetails(salary)}
                    className="text-primary-600 hover:text-primary-900 p-2 rounded-lg hover:bg-primary-50 transition-colors duration-200"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {!salary.isPaid && (
                    <>
                      <button
                        onClick={() => onViewBreakdown(salary)}
                        className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50 transition-colors duration-200"
                        title="View Breakdown"
                      >
                        <Calculator className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(salary)}
                        className="text-orange-600 hover:text-orange-900 p-2 rounded-lg hover:bg-orange-50 transition-colors duration-200"
                        title="Edit Salary"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onPay(salary)}
                        className="text-green-600 hover:text-green-900 p-2 rounded-lg hover:bg-green-50 transition-colors duration-200"
                        title="Pay Salary"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {/* Always show Download button */}
                  <button
                    onClick={() => onDownloadPayslip(salary._id)}
                    className="text-purple-600 hover:text-purple-900 p-2 rounded-lg hover:bg-purple-50 transition-colors duration-200"
                    title="Download Payslip"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ✅ NEW: Salary Breakdown Modal
const SalaryBreakdownModal = ({
  salary,
  formatCurrency,
  formatMonth,
  onClose,
  onProceedToPay,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Salary Calculation Breakdown
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Employee Info */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">
              Employee Details
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-blue-700">Name</p>
                <p className="font-medium text-blue-900">
                  {salary.employee?.fullName}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-700">Employee Code</p>
                <p className="font-medium text-blue-900">
                  {salary.employee?.employeeCode}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-700">Role</p>
                <p className="font-medium text-blue-900 capitalize">
                  {salary.employee?.role?.replace(/_/g, " ")}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-700">Month</p>
                <p className="font-medium text-blue-900">
                  {formatMonth(salary.month)}
                </p>
              </div>
            </div>
          </div>

          {/* Prorated Warning */}
          {salary.isProrated && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-900">
                    Prorated Salary
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    {salary.proratedReason}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Calculation Steps */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">
              Step-by-Step Calculation
            </h4>

            {/* Step 1: Base Salary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">
                    1. Base Monthly Salary
                  </p>
                  <p className="text-sm text-gray-600">Fixed salary amount</p>
                </div>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(salary.baseSalary)}
                </p>
              </div>
            </div>

            {/* Step 2: Per Day Calculation */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">2. Per Day Amount</p>
                  <p className="text-sm text-gray-600">
                    {formatCurrency(salary.baseSalary)} ÷{" "}
                    {salary.monthWorkingDays || salary.totalWorkingDays} working
                    days
                  </p>
                </div>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(salary.perDayAmount)}
                </p>
              </div>
            </div>

            {/* Step 3: Earned Amount (if prorated) */}
            {salary.isProrated && (
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-green-900">
                      3. Earned Amount (Prorated)
                    </p>
                    <p className="text-sm text-green-700">
                      {formatCurrency(salary.perDayAmount)} ×{" "}
                      {salary.totalWorkingDays} days worked
                    </p>
                  </div>
                  <p className="text-lg font-bold text-green-900">
                    {formatCurrency(
                      salary.perDayAmount * salary.totalWorkingDays
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Deductions */}
            <div className="bg-red-50 rounded-lg p-4">
              <p className="font-medium text-red-900 mb-3">
                {salary.isProrated ? "4" : "3"}. Deductions
              </p>
              <div className="space-y-2">
                {salary.absentDays > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-red-700">
                      Absent Days ({salary.absentDays} ×{" "}
                      {formatCurrency(salary.perDayAmount)})
                    </span>
                    <span className="font-medium text-red-900">
                      - {formatCurrency(salary.absentDeduction)}
                    </span>
                  </div>
                )}
                {salary.halfDays > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-red-700">
                      Half Days ({salary.halfDays} ×{" "}
                      {formatCurrency(salary.perDayAmount / 2)})
                    </span>
                    <span className="font-medium text-red-900">
                      - {formatCurrency(salary.halfDayDeduction)}
                    </span>
                  </div>
                )}
                {salary.unpaidLeaveDays > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-red-700">
                      Unpaid Leave ({salary.unpaidLeaveDays} ×{" "}
                      {formatCurrency(salary.perDayAmount)})
                    </span>
                    <span className="font-medium text-red-900">
                      - {formatCurrency(salary.unpaidLeaveDeduction)}
                    </span>
                  </div>
                )}
                {salary.otherDeductions?.map((ded, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-red-700">{ded.title}</span>
                    <span className="font-medium text-red-900">
                      - {formatCurrency(ded.amount)}
                    </span>
                  </div>
                ))}
                <div className="border-t border-red-200 pt-2 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span className="text-red-900">Total Deductions</span>
                    <span className="text-red-900">
                      - {formatCurrency(salary.totalDeductions)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 5: Final Calculation */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-5 border-2 border-green-300">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    Final Net Salary
                  </p>
                  <p className="text-sm text-gray-600">
                    {salary.isProrated
                      ? `${formatCurrency(
                          salary.perDayAmount * salary.totalWorkingDays
                        )} - ${formatCurrency(salary.totalDeductions)}`
                      : `${formatCurrency(
                          salary.baseSalary
                        )} - ${formatCurrency(salary.totalDeductions)}`}
                  </p>
                </div>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(salary.netSalary)}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
            {!salary.isPaid && (
              <button
                onClick={onProceedToPay}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Proceed to Pay</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ================== PAYMENT MODAL ==================
const PaymentModal = ({
  salary,
  paymentForm,
  setPaymentForm,
  handlePaySalary,
  processing,
  formatCurrency,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Pay Salary</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handlePaySalary} className="p-6 space-y-6">
          {/* Salary Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Employee</p>
                <p className="font-medium text-gray-900">
                  {salary.employee?.fullName}
                </p>
                <p className="text-xs text-gray-500">
                  {salary.employee?.employeeCode}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Net Salary</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(salary.netSalary)}
                </p>
              </div>
            </div>
            {salary.isProrated && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {salary.proratedReason}
                </span>
              </div>
            )}
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Mode <span className="text-red-500">*</span>
            </label>
            <select
              value={paymentForm.paymentMode}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, paymentMode: e.target.value })
              }
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          {/* Transaction ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction ID / Reference Number
            </label>
            <input
              type="text"
              value={paymentForm.transactionId}
              onChange={(e) =>
                setPaymentForm({
                  ...paymentForm,
                  transactionId: e.target.value,
                })
              }
              placeholder="Enter transaction reference"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Payment Proof */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Proof (Optional)
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) =>
                setPaymentForm({
                  ...paymentForm,
                  paymentProof: e.target.files[0],
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {paymentForm.paymentProof && (
              <p className="text-xs text-gray-500 mt-1">
                Selected: {paymentForm.paymentProof.name}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={paymentForm.notes}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, notes: e.target.value })
              }
              rows={3}
              placeholder="Add any additional notes..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* ✅ Add to Expense Checkbox */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={paymentForm.addToExpense}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    addToExpense: e.target.checked,
                  })
                }
                className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Add to Hostel Expenses
                </span>
                <p className="text-xs text-gray-600 mt-1">
                  Automatically create an expense record for this salary payment
                </p>
              </div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processing}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {processing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Pay Salary</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ✅ NEW: EDIT SALARY MODAL
const EditSalaryModal = ({
  salary,
  editForm,
  setEditForm,
  handleEditSalary,
  processing,
  formatCurrency,
  onClose,
}) => {
  const [newBonus, setNewBonus] = useState({ title: "", amount: "" });
  const [newDeduction, setNewDeduction] = useState({ title: "", amount: "" });

  const addBonus = () => {
    if (!newBonus.title || !newBonus.amount) {
      toast.error("Please fill bonus details");
      return;
    }
    setEditForm({
      ...editForm,
      bonuses: [
        ...editForm.bonuses,
        {
          title: newBonus.title,
          amount: parseFloat(newBonus.amount),
          description: "",
        },
      ],
    });
    setNewBonus({ title: "", amount: "" });
  };

  const removeBonus = (index) => {
    setEditForm({
      ...editForm,
      bonuses: editForm.bonuses.filter((_, i) => i !== index),
    });
  };

  const addDeduction = () => {
    if (!newDeduction.title || !newDeduction.amount) {
      toast.error("Please fill deduction details");
      return;
    }
    setEditForm({
      ...editForm,
      otherDeductions: [
        ...editForm.otherDeductions,
        {
          title: newDeduction.title,
          amount: parseFloat(newDeduction.amount),
          description: "",
        },
      ],
    });
    setNewDeduction({ title: "", amount: "" });
  };

  const removeDeduction = (index) => {
    setEditForm({
      ...editForm,
      otherDeductions: editForm.otherDeductions.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Edit Salary Record
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleEditSalary} className="p-6 space-y-6">
          {/* Current Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Current Salary</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-blue-700">Employee</p>
                <p className="font-medium text-blue-900">
                  {salary.employee?.fullName}
                </p>
              </div>
              <div>
                <p className="text-blue-700">Base Salary</p>
                <p className="font-medium text-blue-900">
                  {formatCurrency(salary.baseSalary)}
                </p>
              </div>
              <div>
                <p className="text-blue-700">Current Net</p>
                <p className="font-medium text-blue-900">
                  {formatCurrency(salary.netSalary)}
                </p>
              </div>
            </div>
          </div>

          {/* Bonuses Section */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Bonuses</h4>

            {/* Existing Bonuses */}
            {editForm.bonuses.length > 0 && (
              <div className="space-y-2 mb-3">
                {editForm.bonuses.map((bonus, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{bonus.title}</p>
                      <p className="text-sm text-green-600">
                        + {formatCurrency(bonus.amount)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBonus(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Bonus */}
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Bonus title"
                value={newBonus.title}
                onChange={(e) =>
                  setNewBonus({ ...newBonus, title: e.target.value })
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <input
                type="number"
                placeholder="Amount"
                value={newBonus.amount}
                onChange={(e) =>
                  setNewBonus({ ...newBonus, amount: e.target.value })
                }
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={addBonus}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Add
              </button>
            </div>
          </div>

          {/* Deductions Section */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">
              Additional Deductions
            </h4>

            {/* Existing Deductions */}
            {editForm.otherDeductions.length > 0 && (
              <div className="space-y-2 mb-3">
                {editForm.otherDeductions.map((deduction, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg p-3"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {deduction.title}
                      </p>
                      <p className="text-sm text-red-600">
                        - {formatCurrency(deduction.amount)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDeduction(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Deduction */}
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Deduction title"
                value={newDeduction.title}
                onChange={(e) =>
                  setNewDeduction({ ...newDeduction, title: e.target.value })
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <input
                type="number"
                placeholder="Amount"
                value={newDeduction.amount}
                onChange={(e) =>
                  setNewDeduction({ ...newDeduction, amount: e.target.value })
                }
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={addDeduction}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Add
              </button>
            </div>
          </div>

          {/* Reason for Edit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Edit <span className="text-red-500">*</span>
            </label>
            <textarea
              value={editForm.reason}
              onChange={(e) =>
                setEditForm({ ...editForm, reason: e.target.value })
              }
              rows={3}
              required
              placeholder="Explain why you're editing this salary record..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Important Note:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>All changes will be recorded in the audit trail</li>
                  <li>Salary will be recalculated automatically</li>
                  <li>You cannot edit a paid salary record</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processing || !editForm.reason}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {processing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ================== DETAILS MODAL ==================
const DetailsModal = ({
  salary,
  formatCurrency,
  formatMonth,
  onClose,
  onDownloadPayslip,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Salary Details
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Employee Info */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">
                Employee Information
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">
                    {salary.employee?.fullName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Employee Code:</span>
                  <span className="font-medium">
                    {salary.employee?.employeeCode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Role:</span>
                  <span className="font-medium capitalize">
                    {salary.employee?.role?.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Department:</span>
                  <span className="font-medium capitalize">
                    {salary.employee?.department || "-"}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">
                Salary Period
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Month:</span>
                  <span className="font-medium">
                    {formatMonth(salary.month)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span
                    className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                      salary.isPaid
                        ? "bg-green-100 text-green-800"
                        : "bg-orange-100 text-orange-800"
                    }`}
                  >
                    {salary.isPaid ? "Paid" : "Pending"}
                  </span>
                </div>
                {salary.isProrated && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      Prorated
                    </span>
                  </div>
                )}
                {salary.isPaid && salary.paidDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Paid Date:</span>
                    <span className="font-medium">
                      {new Date(salary.paidDate).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Prorated Info */}
          {salary.isProrated && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-900">
                    Prorated Salary
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    {salary.proratedReason}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Summary */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">
              Attendance Summary
            </h4>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600">Working Days</p>
                <p className="text-xl font-bold text-gray-900">
                  {salary.totalWorkingDays}
                  {salary.monthWorkingDays &&
                    salary.totalWorkingDays !== salary.monthWorkingDays && (
                      <span className="text-sm text-gray-500 ml-1">
                        / {salary.monthWorkingDays}
                      </span>
                    )}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-green-700">Present</p>
                <p className="text-xl font-bold text-green-600">
                  {salary.presentDays}
                </p>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-xs text-red-700">Absent</p>
                <p className="text-xl font-bold text-red-600">
                  {salary.absentDays}
                </p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3">
                <p className="text-xs text-orange-700">Half Day</p>
                <p className="text-xl font-bold text-orange-600">
                  {salary.halfDays}
                </p>
              </div>
            </div>
          </div>

          {/* Salary Breakdown */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">
              Salary Breakdown
            </h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Base Salary:</span>
                <span className="font-medium">
                  {formatCurrency(salary.baseSalary)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Per Day Amount:</span>
                <span className="font-medium">
                  {formatCurrency(salary.perDayAmount)}
                </span>
              </div>

              {/* Bonuses */}
              {salary.bonuses && salary.bonuses.length > 0 && (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-gray-700 font-medium mb-1">Bonuses:</p>
                  {salary.bonuses.map((bonus, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between pl-4 text-green-600"
                    >
                      <span>{bonus.title}</span>
                      <span>+ {formatCurrency(bonus.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Deductions */}
              <div className="pt-2 border-t border-gray-200">
                <p className="text-gray-700 font-medium mb-1">Deductions:</p>
                {salary.absentDeduction > 0 && (
                  <div className="flex justify-between pl-4 text-red-600">
                    <span>Absent Days ({salary.absentDays})</span>
                    <span>- {formatCurrency(salary.absentDeduction)}</span>
                  </div>
                )}
                {salary.halfDayDeduction > 0 && (
                  <div className="flex justify-between pl-4 text-red-600">
                    <span>Half Days ({salary.halfDays})</span>
                    <span>- {formatCurrency(salary.halfDayDeduction)}</span>
                  </div>
                )}
                {salary.unpaidLeaveDeduction > 0 && (
                  <div className="flex justify-between pl-4 text-red-600">
                    <span>Unpaid Leave ({salary.unpaidLeaveDays})</span>
                    <span>- {formatCurrency(salary.unpaidLeaveDeduction)}</span>
                  </div>
                )}
                {salary.otherDeductions?.map((ded, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between pl-4 text-red-600"
                  >
                    <span>{ded.title}</span>
                    <span>- {formatCurrency(ded.amount)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t-2 border-gray-300">
                <div className="flex justify-between text-base font-bold">
                  <span className="text-gray-900">Net Salary:</span>
                  <span className="text-green-600">
                    {formatCurrency(salary.netSalary)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Info (if paid) */}
          {salary.isPaid && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">
                Payment Information
              </h4>
              <div className="bg-green-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Mode:</span>
                  <span className="font-medium capitalize">
                    {salary.paymentMode?.replace(/_/g, " ")}
                  </span>
                </div>
                {salary.transactionId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-medium">{salary.transactionId}</span>
                  </div>
                )}
                {salary.paidBy && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Paid By:</span>
                    <span className="font-medium">{salary.paidBy.name}</span>
                  </div>
                )}
                {salary.isAddedToExpense !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Added to Expenses:</span>
                    <span
                      className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                        salary.isAddedToExpense
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {salary.isAddedToExpense ? "Yes" : "No"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {salary.notes && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                {salary.notes}
              </p>
            </div>
          )}

          {/* Edit History */}
          {salary.editHistory && salary.editHistory.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Edit History</h4>
              <div className="space-y-2">
                {salary.editHistory.map((edit, idx) => (
                  <div
                    key={idx}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-blue-900">
                        Edited by {edit.editedBy?.name || "Unknown"}
                      </span>
                      <span className="text-xs text-blue-600">
                        {new Date(edit.editedAt).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <p className="text-blue-700">{edit.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
            {salary.isPaid && (
              <button
                onClick={() => onDownloadPayslip(salary._id)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>Download Payslip</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ================== CALCULATE MODAL ==================
const CalculateModal = ({
  employees,
  calculateForm,
  setCalculateForm,
  handleCalculateSalary,
  processing,
  onClose,
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    handleCalculateSalary();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Calculate Salary
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Month <span className="text-red-500">*</span>
            </label>
            <input
              type="month"
              value={calculateForm.month}
              onChange={(e) =>
                setCalculateForm({ ...calculateForm, month: e.target.value })
              }
              max={new Date().toISOString().slice(0, 7)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={calculateForm.calculateAll}
                onChange={(e) =>
                  setCalculateForm({
                    ...calculateForm,
                    calculateAll: e.target.checked,
                    employeeId: e.target.checked
                      ? ""
                      : calculateForm.employeeId,
                  })
                }
                className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-900">
                Calculate for all active employees
              </span>
            </label>
          </div>

          {!calculateForm.calculateAll && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Employee <span className="text-red-500">*</span>
              </label>
              <select
                value={calculateForm.employeeId}
                onChange={(e) =>
                  setCalculateForm({
                    ...calculateForm,
                    employeeId: e.target.value,
                  })
                }
                required={!calculateForm.calculateAll}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select an employee</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.employeeCode} - {emp.fullName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processing}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {processing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Calculating...</span>
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4" />
                  <span>Calculate</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SalaryTab;
