import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft,
  FileText,
  Download,
  Eye,
  CreditCard,
  Calendar,
  IndianRupee,
  CheckCircle,
  Clock,
  Building
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface RentDetailsProps {
  userName: string;
  initialTab?: 'agreement' | 'history';
  onBack: () => void;
}

export function RentDetails({ userName, initialTab = 'agreement', onBack }: RentDetailsProps) {
  const [activeTab, setActiveTab] = useState<'agreement' | 'history'>(initialTab);

  // Mock rent data
  const rentData = {
    propertyAddress: "123 Sunset Boulevard, Apt 4B, Mumbai, MH 400001",
    rentStart: "January 15, 2024",
    rentEnd: "January 14, 2025",
    monthlyRent: "₹45,000",
    securityDeposit: "₹90,000",
    rentType: "Fixed-term Residential Rent",
    landlord: "Sarah Johnson",
    tenant: userName,
    documentId: "RENT-2024-001234"
  };

  // Mock payment history
  const paymentHistory = [
    {
      id: "PAY-001",
      date: "Nov 1, 2024",
      amount: "₹45,000",
      type: "Monthly Rent",
      status: "Paid",
      method: "UPI Transfer",
      dueDate: "Nov 1, 2024"
    },
    {
      id: "PAY-002",
      date: "Oct 1, 2024",
      amount: "₹45,000",
      type: "Monthly Rent",
      status: "Paid",
      method: "UPI Transfer",
      dueDate: "Oct 1, 2024"
    },
    {
      id: "PAY-003",
      date: "Sep 1, 2024",
      amount: "₹45,000",
      type: "Monthly Rent",
      status: "Paid",
      method: "UPI Transfer",
      dueDate: "Sep 1, 2024"
    },
    {
      id: "PAY-004",
      date: "Aug 1, 2024",
      amount: "₹45,000",
      type: "Monthly Rent",
      status: "Paid",
      method: "UPI Transfer",
      dueDate: "Aug 1, 2024"
    },
    {
      id: "PAY-005",
      date: "Jan 15, 2024",
      amount: "₹1,35,000",
      type: "First Month + Security Deposit",
      status: "Paid",
      method: "Bank Transfer",
      dueDate: "Jan 15, 2024"
    }
  ];

  const handleViewPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    // Set up document properties
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = margin;
    
    // Helper function to add text with word wrap
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize = 10) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return y + (lines.length * fontSize * 0.5);
    };
    
    // Header
    doc.setFillColor(44, 122, 123); // Dark teal
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('AAVAS', margin, 20);
    doc.setFontSize(12);
    doc.text('Rent Agreement', margin, 30);
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    yPos = 55;
    
    // Document ID
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Document ID: ${rentData.documentId}`, margin, yPos);
    yPos += 10;
    
    // Divider line
    doc.setDrawColor(44, 122, 123);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 15;
    
    // Title
    doc.setTextColor(44, 122, 123);
    doc.setFontSize(16);
    doc.text('RESIDENTIAL RENT AGREEMENT', margin, yPos);
    yPos += 12;
    
    // Introduction
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    yPos = addWrappedText(
      'This Rent Agreement ("Agreement") is entered into and made effective as of the date set forth below, between the Landlord and Tenant identified herein.',
      margin,
      yPos,
      pageWidth - (2 * margin)
    );
    yPos += 10;
    
    // Parties Section
    doc.setFontSize(12);
    doc.setTextColor(44, 122, 123);
    doc.text('PARTIES', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Landlord:', margin, yPos);
    doc.setFontSize(11);
    doc.text(rentData.landlord, margin + 25, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.text('Tenant:', margin, yPos);
    doc.setFontSize(11);
    doc.text(rentData.tenant, margin + 25, yPos);
    yPos += 15;
    
    // Property Details Section
    doc.setFontSize(12);
    doc.setTextColor(44, 122, 123);
    doc.text('PROPERTY DETAILS', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    yPos = addWrappedText(
      `Address: ${rentData.propertyAddress}`,
      margin,
      yPos,
      pageWidth - (2 * margin)
    );
    yPos += 10;
    
    // Rent Term Section
    doc.setFontSize(12);
    doc.setTextColor(44, 122, 123);
    doc.text('RENT TERM', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Type: ${rentData.rentType}`, margin, yPos);
    yPos += 6;
    doc.text(`Start Date: ${rentData.rentStart}`, margin, yPos);
    yPos += 6;
    doc.text(`End Date: ${rentData.rentEnd}`, margin, yPos);
    yPos += 15;
    
    // Financial Terms Section
    doc.setFontSize(12);
    doc.setTextColor(44, 122, 123);
    doc.text('FINANCIAL TERMS', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Monthly Rent: ${rentData.monthlyRent}`, margin, yPos);
    yPos += 6;
    doc.text(`Security Deposit: ${rentData.securityDeposit}`, margin, yPos);
    yPos += 6;
    doc.text('Payment Due Date: 1st of each month', margin, yPos);
    yPos += 15;
    
    // Terms and Conditions
    doc.setFontSize(12);
    doc.setTextColor(44, 122, 123);
    doc.text('TERMS AND CONDITIONS', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    const terms = [
      '1. RENT PAYMENT: Tenant agrees to pay the monthly rent amount on or before the 1st day of each month.',
      '2. SECURITY DEPOSIT: The security deposit shall be held by the Landlord and may be used to cover any damages to the property beyond normal wear and tear.',
      '3. MAINTENANCE: Tenant agrees to maintain the property in good condition and promptly report any necessary repairs to the Landlord.',
      '4. UTILITIES: Tenant is responsible for payment of utilities including electricity, water, gas, and internet services.',
      '5. PROPERTY USE: The property shall be used solely for residential purposes and shall not be used for any illegal activities.',
      '6. TERMINATION: Either party may terminate this agreement with 30 days written notice, subject to the terms outlined in this agreement.',
      '7. RENEWAL: This rent agreement may be renewed upon mutual agreement of both parties at least 60 days before the expiration date.'
    ];
    
    for (const term of terms) {
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = margin;
      }
      yPos = addWrappedText(term, margin, yPos, pageWidth - (2 * margin));
      yPos += 7;
    }
    
    // Check if we need a new page for signatures
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
    } else {
      yPos += 10;
    }
    
    // Signatures Section
    doc.setFontSize(12);
    doc.setTextColor(44, 122, 123);
    doc.text('SIGNATURES', margin, yPos);
    yPos += 15;
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    // Landlord signature
    doc.text('_________________________', margin, yPos);
    yPos += 6;
    doc.text('Landlord Signature', margin, yPos);
    yPos += 4;
    doc.text(`Name: ${rentData.landlord}`, margin, yPos);
    yPos += 4;
    doc.text(`Date: ${rentData.rentStart}`, margin, yPos);
    yPos += 15;
    
    // Tenant signature
    doc.text('_________________________', margin, yPos);
    yPos += 6;
    doc.text('Tenant Signature', margin, yPos);
    yPos += 4;
    doc.text(`Name: ${rentData.tenant}`, margin, yPos);
    yPos += 4;
    doc.text(`Date: ${rentData.rentStart}`, margin, yPos);
    
    // Footer
    const footerY = pageHeight - 15;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('This is a legally binding document. Keep it in a safe place.', pageWidth / 2, footerY, { align: 'center' });
    doc.text(`Generated via Aavas Platform on ${new Date().toLocaleDateString('en-IN')}`, pageWidth / 2, footerY + 4, { align: 'center' });
    
    // Open PDF in new tab
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  };

  const handleDownloadPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    // Set up document properties
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = margin;
    
    // Helper function to add text with word wrap
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize = 10) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return y + (lines.length * fontSize * 0.5);
    };
    
    // Header
    doc.setFillColor(44, 122, 123); // Dark teal
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('AAVAS', margin, 20);
    doc.setFontSize(12);
    doc.text('Rent Agreement', margin, 30);
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    yPos = 55;
    
    // Document ID
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Document ID: ${rentData.documentId}`, margin, yPos);
    yPos += 10;
    
    // Divider line
    doc.setDrawColor(44, 122, 123);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 15;
    
    // Title
    doc.setTextColor(44, 122, 123);
    doc.setFontSize(16);
    doc.text('RESIDENTIAL RENT AGREEMENT', margin, yPos);
    yPos += 12;
    
    // Introduction
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    yPos = addWrappedText(
      'This Rent Agreement ("Agreement") is entered into and made effective as of the date set forth below, between the Landlord and Tenant identified herein.',
      margin,
      yPos,
      pageWidth - (2 * margin)
    );
    yPos += 10;
    
    // Parties Section
    doc.setFontSize(12);
    doc.setTextColor(44, 122, 123);
    doc.text('PARTIES', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Landlord:', margin, yPos);
    doc.setFontSize(11);
    doc.text(rentData.landlord, margin + 25, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.text('Tenant:', margin, yPos);
    doc.setFontSize(11);
    doc.text(rentData.tenant, margin + 25, yPos);
    yPos += 15;
    
    // Property Details Section
    doc.setFontSize(12);
    doc.setTextColor(44, 122, 123);
    doc.text('PROPERTY DETAILS', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    yPos = addWrappedText(
      `Address: ${rentData.propertyAddress}`,
      margin,
      yPos,
      pageWidth - (2 * margin)
    );
    yPos += 10;
    
    // Rent Term Section
    doc.setFontSize(12);
    doc.setTextColor(44, 122, 123);
    doc.text('RENT TERM', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Type: ${rentData.rentType}`, margin, yPos);
    yPos += 6;
    doc.text(`Start Date: ${rentData.rentStart}`, margin, yPos);
    yPos += 6;
    doc.text(`End Date: ${rentData.rentEnd}`, margin, yPos);
    yPos += 15;
    
    // Financial Terms Section
    doc.setFontSize(12);
    doc.setTextColor(44, 122, 123);
    doc.text('FINANCIAL TERMS', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Monthly Rent: ${rentData.monthlyRent}`, margin, yPos);
    yPos += 6;
    doc.text(`Security Deposit: ${rentData.securityDeposit}`, margin, yPos);
    yPos += 6;
    doc.text('Payment Due Date: 1st of each month', margin, yPos);
    yPos += 15;
    
    // Terms and Conditions
    doc.setFontSize(12);
    doc.setTextColor(44, 122, 123);
    doc.text('TERMS AND CONDITIONS', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    const terms = [
      '1. RENT PAYMENT: Tenant agrees to pay the monthly rent amount on or before the 1st day of each month.',
      '2. SECURITY DEPOSIT: The security deposit shall be held by the Landlord and may be used to cover any damages to the property beyond normal wear and tear.',
      '3. MAINTENANCE: Tenant agrees to maintain the property in good condition and promptly report any necessary repairs to the Landlord.',
      '4. UTILITIES: Tenant is responsible for payment of utilities including electricity, water, gas, and internet services.',
      '5. PROPERTY USE: The property shall be used solely for residential purposes and shall not be used for any illegal activities.',
      '6. TERMINATION: Either party may terminate this agreement with 30 days written notice, subject to the terms outlined in this agreement.',
      '7. RENEWAL: This rent agreement may be renewed upon mutual agreement of both parties at least 60 days before the expiration date.'
    ];
    
    for (const term of terms) {
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = margin;
      }
      yPos = addWrappedText(term, margin, yPos, pageWidth - (2 * margin));
      yPos += 7;
    }
    
    // Check if we need a new page for signatures
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
    } else {
      yPos += 10;
    }
    
    // Signatures Section
    doc.setFontSize(12);
    doc.setTextColor(44, 122, 123);
    doc.text('SIGNATURES', margin, yPos);
    yPos += 15;
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    // Landlord signature
    doc.text('_________________________', margin, yPos);
    yPos += 6;
    doc.text('Landlord Signature', margin, yPos);
    yPos += 4;
    doc.text(`Name: ${rentData.landlord}`, margin, yPos);
    yPos += 4;
    doc.text(`Date: ${rentData.rentStart}`, margin, yPos);
    yPos += 15;
    
    // Tenant signature
    doc.text('_________________________', margin, yPos);
    yPos += 6;
    doc.text('Tenant Signature', margin, yPos);
    yPos += 4;
    doc.text(`Name: ${rentData.tenant}`, margin, yPos);
    yPos += 4;
    doc.text(`Date: ${rentData.rentStart}`, margin, yPos);
    
    // Footer
    const footerY = pageHeight - 15;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('This is a legally binding document. Keep it in a safe place.', pageWidth / 2, footerY, { align: 'center' });
    doc.text(`Generated via Aavas Platform on ${new Date().toLocaleDateString('en-IN')}`, pageWidth / 2, footerY + 4, { align: 'center' });
    
    // Save the PDF
    doc.save(`Rent_Agreement_${rentData.documentId}.pdf`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-6xl mx-auto space-y-6"
    >
      {/* Header with Back Button */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="flex items-center space-x-4 mb-6"
      >
        <Button
          variant="ghost"
          onClick={onBack}
          className="p-2 rounded-full"
          style={{ backgroundColor: 'transparent' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(44, 122, 123, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <ArrowLeft className="w-5 h-5" style={{ color: 'var(--tenant-primary)' }} />
        </Button>
        <div>
          <h1 style={{ color: 'var(--tenant-primary)' }}>
            Rent Details
          </h1>
          <p className="text-muted-foreground">
            Manage your rent agreement and payment history
          </p>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="flex space-x-1 rounded-lg p-1"
        style={{ backgroundColor: 'rgba(44, 122, 123, 0.1)' }}
      >
        <Button
          variant={activeTab === 'agreement' ? 'default' : 'ghost'}
          className="flex-1 text-white"
          style={activeTab === 'agreement' ? { backgroundColor: 'var(--tenant-primary)' } : { color: 'var(--tenant-primary)' }}
          onMouseEnter={(e) => {
            if (activeTab !== 'agreement') {
              e.currentTarget.style.backgroundColor = 'rgba(44, 122, 123, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'agreement') {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          onClick={() => setActiveTab('agreement')}
        >
          <FileText className="w-4 h-4 mr-2" />
          Rent Agreement
        </Button>
        <Button
          variant={activeTab === 'history' ? 'default' : 'ghost'}
          className="flex-1 text-white"
          style={activeTab === 'history' ? { backgroundColor: 'var(--tenant-primary)' } : { color: 'var(--tenant-primary)' }}
          onMouseEnter={(e) => {
            if (activeTab !== 'history') {
              e.currentTarget.style.backgroundColor = 'rgba(44, 122, 123, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'history') {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          onClick={() => setActiveTab('history')}
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Payment History
        </Button>
      </motion.div>

      {/* Content Area */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'agreement' ? (
          <div className="space-y-6">
            {/* Rent Agreement Section */}
            <Card className="border-2" style={{ borderColor: 'var(--tenant-primary)' }}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--tenant-primary)' }}>
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle style={{ color: 'var(--tenant-primary)' }}>
                        Rent Agreement Document
                      </CardTitle>
                      <CardDescription>
                        Your official rental agreement
                      </CardDescription>
                    </div>
                  </div>
                  <Badge style={{ backgroundColor: 'rgba(122, 216, 158, 0.2)', color: 'var(--tenant-success-dark)' }}>
                    Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Document Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    className="flex-1 text-white"
                    style={{ backgroundColor: 'var(--tenant-primary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--tenant-primary-dark)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--tenant-primary)'}
                    onClick={handleViewPDF}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Rent Agreement
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    style={{ borderColor: 'var(--tenant-primary)', color: 'var(--tenant-primary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(44, 122, 123, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={handleDownloadPDF}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </div>

                <Separator style={{ backgroundColor: 'var(--tenant-primary)', opacity: 0.3 }} />

                {/* Rent Summary */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="mb-2" style={{ color: 'var(--tenant-primary)' }}>Property Details</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start space-x-2">
                          <Building className="w-4 h-4 mt-0.5 text-muted-foreground" />
                          <span>{rentData.propertyAddress}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-2" style={{ color: 'var(--tenant-primary)' }}>Rent Term</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{rentData.rentStart} - {rentData.rentEnd}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{rentData.rentType}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="mb-2" style={{ color: 'var(--tenant-primary)' }}>Financial Terms</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Monthly Rent:</span>
                          <span style={{ color: 'var(--tenant-primary)' }}>{rentData.monthlyRent}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Security Deposit:</span>
                          <span>{rentData.securityDeposit}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-2" style={{ color: 'var(--tenant-primary)' }}>Parties</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Landlord:</span>
                          <span>{rentData.landlord}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Tenant:</span>
                          <span>{rentData.tenant}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--tenant-accent)' }}>
                  <div className="flex items-start space-x-3">
                    <FileText className="w-5 h-5 mt-0.5" style={{ color: 'var(--tenant-primary)' }} />
                    <div className="text-sm">
                      <p className="mb-1" style={{ color: 'var(--tenant-primary)' }}>Document ID: {rentData.documentId}</p>
                      <p className="text-muted-foreground">
                        This is your official rent agreement. Keep this document safe and refer to it for any questions about your tenancy terms.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Payment History Section */}
            <Card className="border-2" style={{ borderColor: 'var(--tenant-primary)' }}>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--tenant-primary)' }}>
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle style={{ color: 'var(--tenant-primary)' }}>
                      Payment History
                    </CardTitle>
                    <CardDescription>
                      Complete record of your rent payments
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Payment Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(122, 216, 158, 0.15)' }}>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5" style={{ color: 'var(--tenant-success-dark)' }} />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Paid</p>
                        <p style={{ color: 'var(--tenant-success-dark)' }}>₹2,70,000</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--tenant-accent)' }}>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5" style={{ color: 'var(--tenant-primary)' }} />
                      <div>
                        <p className="text-sm text-muted-foreground">Payments Made</p>
                        <p style={{ color: 'var(--tenant-primary)' }}>5</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--tenant-accent)' }}>
                    <div className="flex items-center space-x-2">
                      <IndianRupee className="w-5 h-5" style={{ color: 'var(--tenant-primary)' }} />
                      <div>
                        <p className="text-sm text-muted-foreground">Next Payment</p>
                        <p style={{ color: 'var(--tenant-primary)' }}>Dec 1, 2024</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="mb-6" style={{ backgroundColor: 'var(--tenant-primary)', opacity: 0.3 }} />

                {/* Payment History Table */}
                <div className="rounded-lg border" style={{ borderColor: 'var(--tenant-primary)' }}>
                  <Table>
                    <TableHeader>
                      <TableRow style={{ backgroundColor: 'var(--tenant-accent)' }}>
                        <TableHead>Date Paid</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentHistory.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{payment.date}</TableCell>
                          <TableCell style={{ color: 'var(--tenant-primary)' }}>{payment.amount}</TableCell>
                          <TableCell>{payment.type}</TableCell>
                          <TableCell>{payment.method}</TableCell>
                          <TableCell>
                            <Badge style={{ backgroundColor: 'rgba(122, 216, 158, 0.2)', color: 'var(--tenant-success-dark)' }}>
                              {payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{payment.dueDate}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--tenant-accent)' }}>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 mt-0.5" style={{ color: 'var(--tenant-success-dark)' }} />
                    <div className="text-sm">
                      <p className="mb-1" style={{ color: 'var(--tenant-success-dark)' }}>Perfect Payment Record!</p>
                      <p className="text-muted-foreground">
                        You have maintained an excellent payment history with all payments made on time.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}