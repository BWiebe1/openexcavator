"""
Created on Jul 25, 2018

@author: ionut
"""

#see https://github.com/87yj/EmlidIMU/blob/master/Reach IMU setup.pdf to get RTIMU running

import logging
import json
import math
import sys
import time

sys.path.append(".")
import RTIMU

logging.basicConfig(level=logging.DEBUG, datefmt="%Y-%m-%d %H:%M:%S",
                    format="[%(asctime)s] - %(levelname)s - %(message)s")

def main():
    logging.info("starting IMU reader application after 4 seconds")
    time.sleep(4.0)
    stgs = RTIMU.Settings("RTIMULib")
    imu = RTIMU.RTIMU(stgs)
    imu.setSlerpPower(0.02)
    imu.setGyroEnable(True)
    imu.setAccelEnable(True)
    imu.setCompassEnable(True)
    logging.info("initializing IMU")
    if not imu.IMUInit():
        logging.error("IMU Init Failed")
        sys.exit(1)

    poll_interval = imu.IMUGetPollInterval()
    logging.info("recommended poll interval: %d ms", poll_interval)

    read_error_count = 0
    while True:
        if imu.IMURead():
            # x, y, z = imu.getFusionData()
            # print("%f %f %f" % (x,y,z))
            read_error_count = 0 
            data = imu.getIMUData()
            fusion_pose = data["fusionPose"]
            data = {"r": math.degrees(fusion_pose[0]), "p": math.degrees(fusion_pose[1]),
                         "y": math.degrees(fusion_pose[2]), "t": time.time()}
            output_file = open("/tmp/imu", "w")
            output_file.write(json.dumps(data) + "\n")
            output_file.close()
            time.sleep(poll_interval / 1000.0) #ms to seconds
        else:
            if read_error_count > 1000:
                logging.error("read_error_count threshold has been hit, restarting")
                sys.exit(1)
            read_error_count += 1
            time.sleep(0.1)

if __name__ == "__main__":
    main()
