# openexcavator

## About
The application is intended to be used with a high precision GPS receiver for assisting excavation operations (assist with bucket positioning for land leveling, trenching).  
When IMU data (roll, pitch, yaw) is available it will be used together with antenna height to determine the bucket position more precisely.  
It uses a thread for reading GPS data and a thread for reading IMU data; on the web part it's using the Tornado web framework and Bootstrap 4 and Leaflet libraries.  
It is designed to run on a Raspberry Pi (but can run on other devices as well) and present a web interface used by the operator on a smartphone / tablet / notebook PC.

## Installation
Install dependencies (use `sudo apt-get install python3-pip python3-dev` if you don't have pip installed):
```
sudo pip3 install tornado
```
Since the application has a restart function it needs to run unde the Pi user:
```
sudo mkdir /var/www
sudo chown -R pi:pi /var/www
cd /var/www
git clone https://github.com/dkwiebe/openexcavator
cd openexcavator
python3 openexcavator/database.py #initialize database entries
```
To enable the application to start at boot copy the `openexcavator.service` systemd file from the `scripts` folder to `/etc/systemd/system` and enable it using:
```
sudo cp /var/www/openexcavator/scripts/openexcavator.service /etc/systemd/system/
sudo systemctl daemon-reload  
sudo systemctl enable openexcavator && sudo systemctl start openexcavator
```
Check the logs to be sure the application is working as expected:
```
journalctl -f -u openexcavator
```
### IMU
To integrate the IMU data as well, you need to install the applications from the `scripts` folder.  
First install the `RTIMULib2` package from `https://github.com/richardstechnotes/RTIMULib2` (parts of these instructions are adjusted from [this](https://github.com/87yj/EmlidIMU/) repo): 
Edit */etc/ld.so.conf* using `nano /etc/ld.so.conf` and add the line `/usr/local/lib`  
```
opkg install cmake
mkdir /imu && cd /imu
git clone https://github.com/richardstechnotes/RTIMULib2
cd RTIMULib2/Linux/
```  
Edit *CMakeLists.txt* using `nano CMakeLists.txt` and set: `OPTION(BUILD_GL “Build RTIMULibGL”  OFF)`  
```
mkdir build && cd build
cmake ..
make -j 4
make install
ldconfig
/usr/local/bin/RTIMULibCal
cd ../python
python setup.py install
cd tests
/usr/local/bin/RTIMULibCal #this will generate the needed RTIMULib.ini file
```  
Edit RTIMULib.ini using `nano RTIMULib.ini` and set:  
```
IMUType=7
BusISI2C=false
SPIBus=5
SPISelect=1
```
You can now test if the IMU data is being correctly read by running: `python Fusion.py`  
Afterwards copy the Python scripts (`imu_reader.py` and `imu_server.py`) into the destination folder  
```
cd /imu/RTIMULib2/Linux/python/tests
nano imu_reader.py #paste content here
nano imu_server.py #paste content here
```
and copy the systemd service definitions (`imu_reader.service` and `imu_server.service`) to 
```
cd /etc/systemd/system/`
nano imu_reader.service #paste content here
nano imu_server.service #paste content here
```
You can now enable and start the services
``` 
sudo systemctl daemon-reload  
sudo systemctl enable imu_reader && sudo systemctl start imu_reader
sudo systemctl enable imu_server && sudo systemctl start imu_server
```
after which you should see IMU data (roll, pitch and yaw) in the web application (make sure the IMU host and port settings in the web application point to the correct host).
### nginx
While not strictly necessary it's a good idea to put `nginx` in front of the web application:
```
sudo apt-get install nginx
```
Afterwards edit `/etc/nginx/sites-available/default`:
```
server {
        listen 80 default_server;
        location / {
                proxy_pass http://127.0.0.1:8000;
        }
        location /static/ {
            root /var/www/openexcavator;
            access_log off;
        }
}
```
## Code
 - the main module is `openexcavator.py` which starts the GPS and IMU threads and initializes the web application  
 - `settings.py` contains the Tornado-specific values (host, port to listen on, template and static paths)  
 - `database.py` holds database functions used to retrieve and update the configuration values (such as GPS host and port, IMU host and port, designated path, antenna height, safety height and start/stop altitude values); these values are stored in a SQLite3 database (`openexcavator.db`)  
 - `handlers.py` contains the implementation for the web application requests (render `home.html` and `tools.html`, return new position & IMU data from the threads, update configuration and restart application)  
 -  the `reach` package has implementations for GPS and IMU TCP clients (to retrieve the data from the Reach device)  
 -  the application uses Javascript for map rendering and data calculations (relevant files in the `static` folder are `common.js`, `home.js`, `tools.js`)  
 -  the `scripts` folder contains the implementation for Reach IMU data (which need to be deployed on Reach) and the `systemd` service definition for openexcavator  