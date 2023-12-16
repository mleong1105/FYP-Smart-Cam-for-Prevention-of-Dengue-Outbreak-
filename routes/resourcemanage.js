const express = require('express');
const router = express.Router();
const pool = require('../db/mssql');
const sql = require("mssql")

router.post('/search', (req, res) => {
    const LinkUrl = req.body.linkUrl? req.body.linkUrl : null
    const Type = req.body.type? req.body.type : null
    const Description = req.body.description? req.body.description : null

    pool.connect().then(connection => {
        return connection.request()
            .input('LinkUrl', sql.NVarChar(500), LinkUrl)
            .input('Type', sql.NVarChar(50), Type)
            .input('Description', sql.NVarChar(200), Description)
            .execute('SP_Resource_Link_Search')
            .then(result => {
                connection.release();
                res.json({ status: 'success', result: result.recordset});
            }).catch(error => {
                console.error('Error executing stored procedure:', error);
                connection.release();
                res.status(500).json({ status: 'error', message: 'Internal server error' });
            });
    })
    .catch(error => {
      console.error('Error:', error);
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    });
});

router.post('/edit', (req, res) => {
    const LinkId = req.body.linkId? req.body.linkId : null
    const LinkUrl = req.body.linkUrl? req.body.linkUrl : null
    const Type = req.body.type? req.body.type : null
    const Description = req.body.description? req.body.description : null

    if (!LinkId && !LinkUrl && !Type && !Description) {
        res.json({ status: 'fail', message: 'Input Empty' });
        return;
    }

    pool.connect().then(connection => {
        return connection.request()
            .input('LinkId', sql.Int, parseInt(LinkId))
            .input('LinkUrl', sql.NVarChar(500), LinkUrl)
            .input('Type', sql.NVarChar(50), Type)
            .input('Description', sql.NVarChar(200), Description)
            .execute('SP_Resource_Link_Update')
            .then(result => {
                connection.release();
                console.log(result.recordset)
                res.json({ status: 'success'});
            }).catch(error => {
                console.error('Error executing stored procedure:', error);
                connection.release();
                res.status(500).json({ status: 'error', message: 'Internal server error' });
            });
    })
    .catch(error => {
      console.error('Error:', error);
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    });
});

router.post('/add', (req, res) => {
    const LinkUrl = req.body.linkUrl? req.body.linkUrl : null
    const Type = req.body.type? req.body.type : null
    const Description = req.body.description? req.body.description : null

    if (!LinkUrl && !Type && !Description) {
        res.json({ status: 'fail', message: 'Input Empty' });
        return;
    }

    pool.connect().then(connection => {
        return connection.request()
            .input('LinkUrl', sql.NVarChar(500), LinkUrl)
            .input('Type', sql.NVarChar(50), Type)
            .input('Description', sql.NVarChar(200), Description)
            .execute('SP_Resource_Link_Add')
            .then(result => {
                connection.release();
                console.log(result.recordset)
                res.json({ status: 'success'});
            }).catch(error => {
                console.error('Error executing stored procedure:', error);
                connection.release();
                res.status(500).json({ status: 'error', message: 'Internal server error' });
            });
    })
    .catch(error => {
      console.error('Error:', error);
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    });
});

router.post('/delete', (req, res) => {
    const LinkID = req.body.linkId ? parseInt(req.body.linkId) : null;

    if (!LinkID) {
        res.json({ status: 'fail', message: 'Invalid LinkID' });
        return;
    }

    pool.connect().then(connection => {
        return connection.request()
            .input('LinkId', sql.Int, LinkID)
            .execute('SP_Resource_Link_Delete')
            .then(result => {
                connection.release();
                console.log(result.recordset)
                res.json({ status: 'success'});
            }).catch(error => {
                console.error('Error executing stored procedure:', error);
                connection.release();
                res.status(500).json({ status: 'error', message: 'Internal server error' });
            });
    })
    .catch(error => {
      console.error('Error:', error);
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    });
});
module.exports = router;
