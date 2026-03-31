import { Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const handleCsvUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No CSV file uploaded' });
      return;
    }

    const csvPath = req.file.path;
    const scriptPath = path.join(__dirname, '../../ml/predict.py');
    const modelPath = path.join(__dirname, '../../ml/sleep_model.keras');

    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
    const pythonProcess = spawn(pythonCommand, [scriptPath, modelPath, csvPath]);

    let rawData = '';
    let errorData = ''; // CRITICAL: This captures the actual Python crash log

    // Collect standard output
    pythonProcess.stdout.on('data', (chunk) => {
      rawData += chunk.toString();
    });

    // Collect standard error (Stack traces, missing modules)
    pythonProcess.stderr.on('data', (chunk) => {
      errorData += chunk.toString();
    });

    pythonProcess.on('close', (code) => {
      // Clean up the temporary CSV file
      if (fs.existsSync(csvPath)) {
        fs.unlinkSync(csvPath);
      }

      // If Python crashed (code !== 0), spit the exact error into Postman
      if (code !== 0) {
        console.error(`[PYTHON CRASH LOG]:\n${errorData}`);
        res.status(500).json({ 
          error: 'Python script execution failed', 
          details: errorData.trim() || 'No error trace captured. Check Python path.' 
        });
        return;
      }

      try {
        const result = JSON.parse(rawData);
        if (!result.success) {
          res.status(400).json({ error: result.error });
          return;
        }
        res.status(200).json({ data: result });
      } catch (parseError) {
        console.error("Failed to parse Python output:", rawData);
        res.status(500).json({ error: 'Invalid JSON output from model', rawOutput: rawData });
      }
    });

  } catch (error) {
    console.error("Upload handler error:", error);
    res.status(500).json({ error: 'Internal server error during processing' });
  }
};