const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('🚀 PSA Card Scanner - Inventory System');
  console.log('='.repeat(50));
  console.log(`📡 Server running on http://localhost:${PORT}`);
});
