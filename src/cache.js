const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const crl = require('./crl');
const { addHours } = require('./utils');

const CACHE_FOLDER = process.env.VC19_CACHE_FOLDER || '.cache';
const CRL_FILE = 'crl.json';
const RULES_FILE = 'rules.json';
const SIGNATURES_LIST_FILE = 'signatureslist.json';
const SIGNATURES_FILE = 'signatures.json';

const CRL_FILE_PATH = path.join(CACHE_FOLDER, CRL_FILE);
const SIGNATURES_FILE_PATH = path.join(CACHE_FOLDER, SIGNATURES_FILE);
const RULES_FILE_PATH = path.join(CACHE_FOLDER, RULES_FILE);
const SIGNATURES_LIST_FILE_PATH = path.join(CACHE_FOLDER, SIGNATURES_LIST_FILE);

const UPDATE_WINDOW_HOURS = 24;

class Cache {
  async setUp(crlManager = crl) {
    fs.mkdirSync(CACHE_FOLDER, { recursive: true });
    if (!fs.existsSync(CRL_FILE_PATH)) {
      fs.writeFileSync(CRL_FILE_PATH, JSON.stringify({ chunk: 1, version: 0 }));
    }
    this._crlManager = crlManager;
    await this._crlManager.setUp();
  }

  fileNeedsUpdate(filePath) {
    try {
      if (addHours(fs.statSync(filePath).mtime, UPDATE_WINDOW_HOURS) > new Date(Date.now())) {
        return false;
      }
    } catch (err) {
      // Needs update
    }
    return true;
  }

  storeCRLStatus(chunk = 1, version = 0) {
    fs.writeFileSync(CRL_FILE_PATH, JSON.stringify({ chunk, version }));
  }

  storeRules(data) {
    fs.writeFileSync(RULES_FILE_PATH, data);
  }

  storeSignaturesList(data) {
    fs.writeFileSync(SIGNATURES_LIST_FILE_PATH, data);
  }

  storeSignatures(data) {
    fs.writeFileSync(SIGNATURES_FILE_PATH, data);
  }

  needRulesUpdate() {
    return this.fileNeedsUpdate(RULES_FILE_PATH);
  }

  needSignaturesUpdate() {
    return this.fileNeedsUpdate(SIGNATURES_FILE_PATH);
  }

  needSignaturesListUpdate() {
    return this.fileNeedsUpdate(SIGNATURES_LIST_FILE_PATH);
  }

  getCRLStatus() {
    return JSON.parse(fs.readFileSync(CRL_FILE_PATH));
  }

  getRules() {
    return JSON.parse(fs.readFileSync(RULES_FILE_PATH));
  }

  getSignatureList() {
    return JSON.parse(fs.readFileSync(SIGNATURES_LIST_FILE_PATH));
  }

  getSignatures() {
    return JSON.parse(fs.readFileSync(SIGNATURES_FILE_PATH));
  }

  async storeCRLRevokedUVCI(revokedUvci, deletedRevokedUvci) {
    await this._crlManager.storeRevokedUVCI(revokedUvci, deletedRevokedUvci);
  }

  async isUVCIRevoked(uvci) {
    const transformedUVCI = crypto.createHash('sha256').update(uvci).digest('base64');
    return this._crlManager.isUVCIRevoked(transformedUVCI);
  }

  async tearDown() {
    return this._crlManager.tearDown();
  }

  async cleanCRL() {
    fs.writeFileSync(CRL_FILE_PATH, JSON.stringify({ chunk: 1, version: 0 }));
    return this._crlManager.clean();
  }
}

const cacheSingleton = new Cache();

module.exports = cacheSingleton;
