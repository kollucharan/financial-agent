import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.static(join(__dirname, '../public')));

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🎨 Frontend Server running at http://localhost:${PORT}`);
  console.log(`🔗 Make sure Backend API is running on port 5000`);
});