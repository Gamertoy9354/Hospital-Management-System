import { createContext, useContext, useEffect, useState } from 'react';
import api from '../utils/api';

const HospitalContext = createContext({});

export function HospitalProvider({ children }) {
    const [config, setConfig] = useState({
        hospital_name: 'Hospital',
        logo_url: '',
        tagline: '',
        address: '',
        phone: '',
        email: ''
    });

    useEffect(() => {
        api.get('/api/hospital-config/public')
            .then(res => {
                const cfg = {};
                res.data.forEach(item => { cfg[item.key] = item.value; });
                setConfig(cfg);
                document.title = cfg.hospital_name || 'HMS';
            })
            .catch(() => { });
    }, []);

    return (
        <HospitalContext.Provider value={{ config, setConfig }}>
            {children}
        </HospitalContext.Provider>
    );
}

export const useHospital = () => useContext(HospitalContext);
