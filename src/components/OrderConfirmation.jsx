import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from "jspdf";
import QRCode from "qrcode"; // Import the QR code library
import { auth } from '../firebase';
import toast from 'react-hot-toast';

export default function OrderConfirmation() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const downloadPDF = async () => {
    setLoading(true);
    try {
      const doc = new jsPDF();
      
      // Get data
      const amount = localStorage.getItem('buyAmount') || '0';
      const coins = localStorage.getItem('buyCoins') || '0';
      const email = auth.currentUser?.email || 'N/A';
      const date = new Date().toLocaleString();
      const txRef = `TX-${Date.now()}`;

      // 1. Draw Gold Header Rectangle
      doc.setFillColor(212, 175, 55); // Metallic Gold
      doc.rect(0, 0, 210, 40, 'F');
      
      // 2. Header Text
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.text("COIN APP", 105, 20, { align: "center" });
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("PREMIUM PURCHASE RECEIPT", 105, 30, { align: "center" });

      // 3. Receipt Details
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("TRANSACTION DETAILS", 20, 60);
      
      doc.setDrawColor(192, 192, 192); // Silver
      doc.setLineWidth(1);
      doc.line(20, 63, 190, 63);

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Customer Email:`, 20, 75);
      doc.setFont("helvetica", "bold");
      doc.text(`${email}`, 90, 75);

      doc.setFont("helvetica", "normal");
      doc.text(`Date Issued:`, 20, 85);
      doc.setFont("helvetica", "bold");
      doc.text(`${date}`, 90, 85);

      doc.setFont("helvetica", "normal");
      doc.text(`Transaction ID:`, 20, 95);
      doc.setFont("helvetica", "bold");
      doc.text(`${txRef}`, 90, 95);

      doc.setFont("helvetica", "normal");
      doc.text(`Status:`, 20, 105);
      doc.setTextColor(245, 124, 0);
      doc.setFont("helvetica", "bold");
      doc.text(`PENDING ADMIN APPROVAL`, 90, 105);

      // 4. Amount Box (Silver Border)
      doc.setDrawColor(192, 192, 192);
      doc.setLineWidth(2);
      doc.rect(20, 120, 170, 40);
      
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("Total Amount Paid:", 30, 135);
      
      doc.setTextColor(212, 175, 55);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text(`${amount} ETB`, 30, 150);
      
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`(${coins} Coins)`, 120, 150);

      // 5. GENERATE QR CODE
      // We encode the transaction details into the QR code
      const qrData = JSON.stringify({ email, amount, coins, txRef });
      const qrDataUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 150 });
      
      // Stamp the QR code on the bottom right
      doc.addImage(qrDataUrl, 'PNG', 130, 175, 50, 50);
      
      // Add text next to the QR code
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text("Scan to verify", 130, 230);
      doc.text("this transaction", 130, 235);

      // 6. Footer
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(10);
      doc.text("Thank you for choosing Coin App.", 20, 200);
      doc.text("Please keep this receipt", 20, 205);
      doc.text("for your records.", 20, 210);
      doc.text("Built by Syum Teame", 20, 260);

      // Save PDF
      doc.save(`CoinApp_Receipt_${txRef}.pdf`);
      toast.success("Premium Receipt with QR Code Downloaded!");
    } catch (error) {
      console.error(error);
      toast.error("Error generating PDF.");
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '60px auto', textAlign: 'center', padding: '20px' }}>
      <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#4caf50', color: 'white', fontSize: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 4px 10px rgba(76, 175, 80, 0.3)' }}>✓</div>
      
      <h2 style={{ margin: '0 0 10px 0' }}>Order Submitted!</h2>
      <p style={{ color: '#666', marginBottom: '30px' }}>Your payment is pending. An Admin will verify your receipt and add the coins to your account.</p>
      
      <button 
        onClick={downloadPDF} 
        disabled={loading}
        style={{ width: '100%', padding: '15px', marginBottom: '10px', backgroundColor: '#D4AF37', color: 'black', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(212, 175, 55, 0.4)' }}
      >
        {loading ? 'Generating...' : '📄 Download Premium Receipt (PDF)'}
      </button>
      
      <button onClick={() => navigate('/dashboard')} style={{ width: '100%', padding: '15px', backgroundColor: '#1a237e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}>
        Back to Home
      </button>
    </div>
  );
}
