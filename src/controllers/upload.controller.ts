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

    const rawCsvPath = req.file.path;
    // process.cwd() points to the root of the backend folder, safely ignoring dist/ routing
    const scriptPath = path.join(process.cwd(), 'ml', 'predict.py');
    const modelPath = path.join(process.cwd(), 'ml', 'sleep_model.keras');

    const csvPath = rawCsvPath.replace(/\\/g, '/');
    const safeScriptPath = scriptPath.replace(/\\/g, '/');
    const safeModelPath = modelPath.replace(/\\/g, '/');

    // Point directly to the root venv
        // Point straight to the system's native Python instead of a virtual environment
    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';

    const pythonProcess = spawn(pythonCommand, [safeScriptPath, safeModelPath, csvPath]);


    let rawData = '';
    let errorData = '';

    // CRITICAL: This catches ENOENT and stops the 502 Bad Gateway server crash
    pythonProcess.on('error', (err) => {
      console.error('[SPAWN ERROR] Failed to start Python:', err);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'ML Engine failed to boot', 
          details: err.message 
        });
      }
    });

    pythonProcess.stdout.on('data', (chunk) => {
      rawData += chunk.toString();
    });

    pythonProcess.stderr.on('data', (chunk) => {
      errorData += chunk.toString();
    });

    pythonProcess.on('close', (code) => {
      if (fs.existsSync(csvPath)) fs.unlinkSync(csvPath);

      if (code !== 0) {
        console.error(`[PYTHON CRASH LOG]:\n${errorData}`);
        if (!res.headersSent) {
          res.status(500).json({ 
            error: 'Python script execution failed', 
            details: errorData.trim() || 'Check logs' 
          });
        }
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
        if (!res.headersSent) {
           res.status(500).json({ error: 'Invalid JSON output from model', rawOutput: rawData });
        }
      }
    });

  } catch (error) {
    console.error("Upload handler error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error during processing' });
    }
  }
};

