# ModuleProxyWS
////

# Лицензия
////

# Описание
<div style = "font-family: 'Open Sans', sans-serif; font-size: 16px; color: #555">

ModuleProxyWS - один из модулей, обеспечивающих коммуникацию между службами RouteREPL, Sensor и Process и внешней средой в рамках фреймворка EcoLight. 
Выполняет перехват сообщений со стороны служб и Webscocket сервера. Полученные сообщения упаковывает/распаковывает по протоколу [LHP] (https://github.com/Konkery/ModuleLHP/blob/main/README.md) (Light Horizon Protocol).
Модуль использется исключительно как прокси (прослойка) к объекту [**ClassWSServer**](https://github.com/Konkery/ModuleWebSocketServer/blob/main/README.md) (далее - WSS), инкапуслируя в себе логику обмена данными и взаимодействия с прикладными службами. 

### **Конструктор**
Объект создается исключительно в качестве значения поля *proxy* в **ClassWSServer**, его конструктор принимает ссылку на *WSS*, в котором иницализируется:
```js
//внутри конструктора WSS
...
this.proxy = new ProxyWS(this);
...
```

### **Поля**
- <mark style="background-color: lightblue">_WSS</mark> - ссылка на WebSocket сервер;
- <mark style="background-color: lightblue">_SubID</mark> - объект типа { id : sec-ws-key }.

### **События**
- <mark style="background-color: lightblue">repl-sub/sensor-sub/process-sub</mark> - события, которые модуль обрабатывает уповещая *_WSS* о появлении нового подписчика на соответствующую службу; 
- <mark style="background-color: lightblue">repl-read/sensor-read/process-read</mark> - события, которые модуль обрабатывает перехватывая сообщение от одной из служб, после чего инициирует отправку этих данных на *_WSS* по LHP-протоколу; 

### **Методы**
- <mark style="background-color: lightblue">Receive(_data, _key)</mark> - метод, который вызывается извне (со стороны WS) для передачи командего работы регистров;
- <mark style="background-color: lightblue">Send(msg)</mark> - отправляет сообщение в виде JSON-строки в WS Server;
- <mark style="background-color: lightblue">RemoveSub(key)</mark> - метод удаляет подписчика из коллекции *_SubID* по указанному ключу;
- <mark style="background-color: lightblue">FormPackREPL(msg)</mark> - формирует объект из сообщения, полученного от службы REPL согласно LHP-протоколу;
- <mark style="background-color: lightblue">FormPackSensor(msg)</mark> - формирует объект из сообщения, полученного от службы Sensor согласно LHP-протоколу;
- <mark style="background-color: lightblue">FormPackProcess(msg)</mark> - формирует объект из сообщения, полученного от службы Process согласно LHP-протоколу;

### **Примеры**
Пример программы:
```js

```
</div>