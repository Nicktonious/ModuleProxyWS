/**
 * @class является придатком WS Server и реализует передачу и обработку запросов и сообщений 
 * как со стороны WS Server (сверху), так и со стороны RouteREPL, SensorManager, Control (снизу). 
 * Экземляр класса инициализируется как поле класса WS Server при успешном создании последнего.
 */
class ProxyWS {
    /**
     * @constructor
     * @param {WS} _wss - WS Server
     */
    constructor(_wss) {
        this._WSS = _wss;
        this._Queue = [];
        this.name = 'ProxyWS';
        this._SubID = {}; //{'MAS-1000': 'hfehklvhelv'}      

        Object.on('repl-sub', (id, key) => {
            this._WSS.clients.filter(client => client.key.hashed === key).forEach(client => {
                if (!client.RegServices.includes('repl')) client.RegServices.push('Repl');
            });

            if (!(this._SubID[id])) this._SubID[id] = key;
        });
        Object.on('sensor-sub', (id, key) => {
            this._WSS.clients.filter(client => client.key.hashed === key).forEach(client => {
                if (!client.RegServices.includes('sensor')) client.RegServices.push('Sensor');
            });

            if (!(this._SubID[id])) this._SubID[id] = key;
        });   
        Object.on('process-sub', (id, key) => {
            this._WSS.clients.filter(client => client.key.hashed === key).forEach(client => {
                if (!client.RegServices.includes('process')) client.RegServices.push('Process');
            });

            if (!(this._SubID[id])) this._SubID[id] = key;
        });

        Object.on('repl-read', msg => {         //обработка события repl-read перехватом сообщения от REPL 
            this.Send(msg);   
        });

        Object.on('sensor-read', msg => {
            this.Send(msg);
        });

        Object.on('process-read', msg => {
            return;
        });
    }
    /**
     * @method 
     * Вызывается извне (со стороны WS) для передачи команд
     * @param {String} _data -  JSON пакет с командами в виде строки
     * @param {String} [key] - ключ с которым WSS ассоциирует отправителя
     */
    Receive(_data, _key) {
        let obj = null;
        try {
            obj = JSON.parse(_data);
        } catch (e) {
            throw new err('Incorrect JSON data');
        }
        let key = _key;
        
        let meta_crc = obj.MetaData.CRC;    //чексумма, полученная из пакета
        delete obj.MetaData.CRC;

        let actual_crc = E.CRC32(JSON.stringify(obj));  //фактическая чексумма

        if (actual_crc === meta_crc) {  //если фактический CRC полученного пакета сходится с CRC зашитым в пакет
            let flag = true;

            obj.MetaData.Command.forEach(comObj => {   //перебор объектов { "com": 'String', "arg": [] }
                if (flag) {
                    if (comObj.com.endsWith('sub') || comObj.com.endsWith('cm')) {
                        Object.emit(comObj.com, obj.MetaData.ID, key);
                        flag = false;
                    }
                    else Object.emit(comObj.com, comObj.arg, obj.MetaData.ID);
                }
            }); 
        }
    }
    /**
     * @method
     * Отправляет сообщение в виде JSON-строки в WS Server
     * @param {String} data сообщение 
     */
    Send(msg) { 
        let data = this.FormPackREPL(msg);
        data.MetaData.CRC = E.CRC32(JSON.stringify(data)); //расчет чексуммы
        this._WSS.Notify(data);         //отправка на WS Server
        
    }
    /**
     * @method 
     * Удаление подписчика из коллекции по ключу
     * @param {String} key 
     */
    RemoveSub(key) {
        for (let k of this._SubID) {
            if (this._SubID[k] === key) delete this._SubID[k];
        };
        if (Object.keys(this._SubID).length === 0) Object.emit('repl-cm', 'EWI');
    }
    /**
     * @method
     * Метод формирует пакет из сообщения, полученного от REPL 
     * @param {String} msg 
     * @returns {Object}
     */
    FormPackREPL(msg) {
        return ({
            "MetaData": {
                "Type": "controller",
                "ID": process.env.SERIAL,
                "TimeStamp2": getTime(),
                "Repl": {
                    "com":""
                },
                "RegServices": "Repl"
            },
            "Value": msg
        });
        let crc = E.CRC32(JSON.stringify(pack));
        pack.MetaData.CRC = crc;
        return pack;
    }
    /**
     * @typedef {Object} SensorMsg
     * @property {String} name
     * @property {Number} value
     */
    /**
     * @method
     * Метод формирует пакет из данных, полученных от Sensor модуля 
     * @param {SensorMsg} msg 
     */
    FormPackSensor(msg) {
        return ({
            "MetaData":{
                "Type":'controller',
                "ID": process.env.SERIAL,
                "TimeStamp2": getTime(),
                "RegServices": "Sensor",
                "Sensor": {
                    "ID": '54-54',
                    "Name": "Vova",
                    "Type": "meas",
                    "TypeOutSignal": "analog",
                    "TypeInSignal":  "analog",
                    "NumPortsRequired": [1],
                    "NumChannel":       1,
                    "Bus":              ["i2c"]
                }
            },
            "Value": msg
        });
        let crc = E.CRC32(JSON.stringify(pack));
        pack.MetaData.CRC = crc;
        return pack;
    }
}
exports = ProxyWS;