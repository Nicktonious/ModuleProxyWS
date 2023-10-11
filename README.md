# ModuleProxyWS
////

# Лицензия
////

# Описание
<div style = "font-family: 'Open Sans', sans-serif; font-size: 16px; color: #555">

ModuleProxyWS - модуль, являющийся частью фреймворка EcoLight и предназначенный для обеспечения обмена сообщениями между службами (RouteREPL, Sensor и т.д) и Websocket сервером. 
Представляет из себя не самостоятельное звено, а прокси-прослойку к объекту класса [**ClassWSServer**](https://github.com/Konkery/ModuleWebSocketServer/blob/main/README.md) (далее - WSS), которая управляет двунаправленным обменом данными между **WSS** и системными службами фреймворка EcoLight.
Обмен сообщениями со службой построен на событийной модели, а взаимодействие с **WSS** происходит напрямую. 
Модуль выполняет две операции:
- Перехватывает сообщения от служб и "упаковывает" их в JSON-строку в соответствии с протоколом [**LHP**](https://github.com/Konkery/ModuleLHP/blob/main/README.md) (Light Horizon Protocol) и отправляет на **WSS**.  
- Принимает JSON-строки от **WSS**, извлекает и маршрутизирует переданные команды. Перед извлечением команд идёт проверка целостности полученного сообщения: **ProxyWS** сверяет фактическую чексумму сообщения с чексуммой, переданной в JSON-пакете.

<div align='center'>
    <img src='./res/interaction.png'>
</div>

### **Конструктор**
Объект создается исключительно в качестве значения поля *proxy* в **ClassWSServer**, его конструктор принимает ссылку на *WSS*, в котором иницализируется:
```js
//внутри конструктора WSS
...
this.proxy = new ProxyWS(this);
...
```

### **Поля**
- <mark style="background-color: lightblue">_WSS</mark> - ссылка на объект WebSocket сервера;
- <mark style="background-color: lightblue">_SubID</mark> - объект типа { id : sec-ws-key }.

### **События**
События, которые модуль обрабатывает уповещая *_WSS* о появлении нового подписчика на соответствующую службу:
- <mark style="background-color: lightblue">Object.on(repl-sub)</mark> 
- <mark style="background-color: lightblue">Object.on(sensor-sub)</mark> 
- <mark style="background-color: lightblue">Object.on(process-sub)</mark> 

События, которые модуль обрабатывает перехватывая сообщение от одной из служб, после чего инициирует отправку этих данных на *_WSS* по LHP-протоколу:
- <mark style="background-color: lightblue">Object.on(repl-read)</mark>
- <mark style="background-color: lightblue">Object.on(sensor-read)</mark>
- <mark style="background-color: lightblue">Object.on(process-read)</mark>

### **Методы**
- <mark style="background-color: lightblue">Receive(_data, _key)</mark> - метод, который вызывается извне (со стороны *WSS*) для отправки команд;
- <mark style="background-color: lightblue">Send(msg)</mark> - отправляет сообщение в виде JSON-строки в WS Server;
- <mark style="background-color: lightblue">RemoveSub(key)</mark> - метод удаляет подписчика из коллекции *_SubID* по указанному ключу;
- <mark style="background-color: lightblue">FormPackREPL(msg)</mark> - формирует объект из сообщения, полученного от службы REPL согласно LHP-протоколу;
- <mark style="background-color: lightblue">FormPackSensor(msg)</mark> - формирует объект из сообщения, полученного от службы Sensor согласно LHP-протоколу;
- <mark style="background-color: lightblue">FormPackProcess(msg)</mark> - формирует объект из сообщения, полученного от службы Process согласно LHP-протоколу;

### **Примеры**
Распаковка сообщения, входящего с WSS:
```js
//data - JSON-пакет в виде строки
Receive(_data, _key) {
    ...
    obj = JSON.parse(_data);
    ...
    //чексумма, полученная из пакета
    let meta_crc = obj.MetaData.CRC;    
    delete obj.MetaData.CRC;

    //фактическая чексумма
    let actual_crc = E.CRC32(JSON.stringify(obj));  

    //проверка на то что фактический CRC полученного пакета сходится с CRC, зашитым в пакет
    if (actual_crc === meta_crc) {  
        
        obj.MetaData.Command.forEach(comObj => {   //перебор объектов { "com": 'String', "arg": [] }
            ...
                //события на 'sub' и 'cm' вызываются с передачей id и sec-ключа в качестве аргументов
                if (comObj.com.endsWith('sub') || comObj.com.endsWith('cm')) {
                    Object.emit(comObj.com, obj.MetaData.ID, key);
                    ...
                }
                //остальные события вызываются с передачей команды и id 
                else Object.emit(comObj.com, comObj.arg, obj.MetaData.ID);
            }
        }); 
    }
}
```

Как указано выше, модуль не является самостоятельным, а потому не используется пользователем напрямую.  
</div>

### **Зависимости**
- <mark style="background-color: lightblue">[**ClassWSServer**](https://github.com/Konkery/ModuleWebSocketServer/blob/main/README.md)</mark> (неявно). 
