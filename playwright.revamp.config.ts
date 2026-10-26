import config from './playwright.config';
export default {...config, use:{...config.use,baseURL:'http://127.0.0.1:3000'},webServer:{...config.webServer,command:'npm start -- --hostname 127.0.0.1',url:'http://127.0.0.1:3000'}};
