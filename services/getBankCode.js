import http from 'http'; // Use `http`, not `https` for localhost

export const getBankCode = (bankName) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/paystack/paystack/mobile-money-banks',
      method: 'GET'
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const banks = parsed.data || parsed; // support structure variation
          if (!bankName) return resolve(banks); // return all banks if no name provided

          const bank = banks.find(b => b.name.toLowerCase() === bankName.toLowerCase());
          resolve(bank ? bank.code : "Bank not found");
        } catch (err) {
          reject("Error parsing bank data");
        }
      });
    });

    req.on('error', error => reject(error));
    req.end();
  });
};

export default getBankCode;
