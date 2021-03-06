const path = require('path');
const winston = require('winston');
const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');
const serveStatic = require('serve-static');
const favicon = require('serve-favicon');
const lnd = require('./lnd');
const app = express();

const wss = require('./wss');
const server = wss.connect(app);

lnd.connect().then(() => {
  winston.info('subscribing to transactions');
  let txSub = lnd.client.subscribeTransactions({});
  txSub.on('data', wss.broadcastTransaction);

  winston.info('subscribing to invoices');
  let invSub = lnd.client.subscribeInvoices({});
  invSub.on('data', wss.broadcastInvoice);
});

app.use(compression());
app.use(favicon(path.join(__dirname, '../public/lnd-explorer-icon.png')));
app.use('/public', serveStatic(path.join(__dirname, '../public')));
app.use('/public/app', serveStatic(path.join(__dirname, '../../dist/app')));
app.use('/public/css', serveStatic(path.join(__dirname, '../../dist/css')));
app.use(bodyParser.json());

app.use(require('./api/api-home'));
app.use(require('./api/api-transactions'));
app.use(require('./api/api-peers'));
app.use(require('./api/api-channels'));
app.use(require('./api/api-invoices'));
app.use(require('./api/api-payments'));
app.use(require('./api/api-network'));
app.use(require('./api/api-address'));
app.use(require('./api/api-message'));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

app.use((err, req, res, next) => {
  winston.error(err);
  res.status(500).json(err);
});

let port = parseInt(process.env.SERVER_PORT) || 8000;
let host = process.env.SERVER_HOST || 'localhost';

server.listen(port, host, () => winston.info(`express listening on ${host}:${port}`));
