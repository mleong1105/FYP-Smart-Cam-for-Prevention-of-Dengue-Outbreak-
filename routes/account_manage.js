const express = require('express');
const router = express.Router();
const pool = require('../db/mssql');
const sql = require("mssql")
const { exec } = require('child_process');

router.post('/useradd', async (req, res) => {
  try {
    const { argument1, argument2 } = req.body;

    // Use the exec function to run the Python script
    exec(`python ${pythonPredictionScript} ${argument1} ${argument2}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing Python script: ${error}`);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }

      console.log(`Python script output: ${stdout}`);
      res.json({ result: stdout });
    });
  } catch (error) {
    console.error(`Error in API endpoint: ${error}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});