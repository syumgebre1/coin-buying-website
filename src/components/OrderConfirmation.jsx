import React from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from "jspdf";
import toast from 'react-hot-toast';

export default function OrderConfirmation() {
  const navigate = useNavigate();

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text("Coin Purchase Receipt", 20, 20);
    doc.setFontSize(14);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 40);
    doc.text("Status: Pending Admin Approval", 20, 50);
    doc.text("Thank you for your purchase!", 20, 70);
    doc.save("receipt.pdf");
    toast.success("PDF Downloaded!");
  };

  return (
    <div style={{ maxWidth: '400px', margin: '60px auto', textAlign: 'center', padding: '20px' }}>
      <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#4caf50', color: 'white', fontSize: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>✓</div>
      <h2>Order Submitted!</h2>
      <p style={{ color: '#666', marginBottom: '30px' }}>Your payment is pending. An Admin will verify your receipt and add the coins to your account.</p>
      
      <button onClick={downloadPDF} style={{ width: '100%', padding: '15px', marginBottom: '10px', backgroundColor: 'white', color: '#d32f2f', border: '1px solid #d32f2f', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>
        📄 Download PDF Receipt
      </button>
      <button onClick={() => navigate('/')} style={{ width: '100%', padding: '15px', backgroundColor: '#1a237e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}>
        Back to Home
      </button>
    </div>
  );
}
