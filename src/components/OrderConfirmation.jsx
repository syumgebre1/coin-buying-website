import React from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from "jspdf";
import { auth } from '../firebase';
import toast from 'react-hot-toast';

export default function OrderConfirmation() {
  const navigate = useNavigate();

  const downloadPDF = () => {
    const doc = new jsPDF();
    
    // 1. Draw Gold Header Rectangle
    doc.setFillColor(212, 175, 55); // Metallic Gold color
    doc.rect(0, 0, 210, 40, 'F');
    
    // 2. Header Text (White & Bold)
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.text("COIN APP", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("PREMIUM PURCHASE RECEIPT", 105, 30, { align: "center" });

    // 3. Watermark / Logo Area
    doc.setTextColor(212, 175, 55);
    doc.setFontSize(80);
    doc.text("🪙", 105, 90, { align: "center" });

    // 4. Receipt Details (Dark Grey)
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("TRANSACTION DETAILS", 20, 120);
    
    // Draw a silver line under the heading
    doc.setDrawColor(192, 192, 192); // Silver
    doc.setLineWidth(1);
    doc.line(20, 123, 190, 123);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Customer Email:`, 20, 135);
    doc.setFont("helvetica", "bold");
    doc.text(`${auth.currentUser?.email || 'N/A'}`, 90, 135);

    doc.setFont("helvetica", "normal");
    doc.text(`Date Issued:`, 20, 145);
    doc.setFont("helvetica", "bold");
    doc.text(`${new Date().toLocaleString()}`, 90, 145);

    doc.setFont("helvetica", "normal");
    doc.text(`Status:`, 20, 155);
    doc.setTextColor(245, 124, 0); // Orange
    doc.setFont("helvetica", "bold");
    doc.text(`PENDING ADMIN APPROVAL`, 90, 155);

    // 5. Draw a Silver Bordered Box for the amount
    doc.setDrawColor(192, 192, 192); // Silver
    doc.setLineWidth(2);
    doc.rect(20, 170, 170, 40);
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(12);
    doc.text("Total Amount Paid:", 30, 185);
    
    // Retrieving amount from local storage for display
    const amount = localStorage.getItem('buyAmount') || '0';
    const coins = localStorage.getItem('buyCoins') || '0';
    
    doc.setTextColor(212, 175, 55); // Gold
    doc.setFontSize(22);
    doc.text(`${amount} ETB`, 30, 200);
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(12);
    doc.text(`(${coins} Coins)`, 120, 200);

    // 6. Footer
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(10);
    doc.text("Thank you for choosing Coin App. Please keep this receipt for your records.", 105, 240, { align: "center" });
    doc.text("Built by Syum Teame", 105, 250, { align: "center" });

    // Save the PDF
    doc.save(`CoinApp_Receipt_${Date.now()}.pdf`);
    toast.success("Premium Receipt Downloaded!");
  };

  return (
    <div style={{ maxWidth: '400px', margin: '60px auto', textAlign: 'center', padding: '20px' }}>
      <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#4caf50', color: 'white', fontSize: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 4px 10px rgba(76, 175, 80, 0.3)' }}>✓</div>
      
      <h2 style={{ margin: '0 0 10px 0' }}>Order Submitted!</h2>
      <p style={{ color: '#666', marginBottom: '30px' }}>Your payment is pending. An Admin will verify your receipt and add the coins to your account.</p>
      
      <button onClick={downloadPDF} style={{ width: '100%', padding: '15px', marginBottom: '10px', backgroundColor: '#D4AF37', color: 'black', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(212, 175, 55, 0.4)' }}>
        📄 Download Premium Receipt (PDF)
      </button>
      
      <button onClick={() => navigate('/dashboard')} style={{ width: '100%', padding: '15px', backgroundColor: '#1a237e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}>
        Back to Home
      </button>
    </div>
  );
}
