"""
Created on Jul 25, 2018

@author: ionut
"""

#see https://github.com/87yj/EmlidIMU/blob/master/Reach IMU setup.pdf to get RTIMU running

import json
import math
import sys
import time

sys.path.append('.')
import RTIMU


def main():
    stgs = RTIMU.Settings("RTIMULib")
    imu = RTIMU.RTIMU(stgs)
    imu.setSlerpPower(0.02)
    imu.setGyroEnable(True)
    imu.setAccelEnable(True)
    imu.setCompassEnable(True)
    if not imu.IMUInit():
        print("IMU Init Failed")
        sys.exit(1)

    poll_interval = imu.IMUGetPollInterval()
    print("recommended poll interval: %d ms" % poll_interval)

    while True:
        if imu.IMURead():
            # x, y, z = imu.getFusionData()
            # print("%f %f %f" % (x,y,z))
            data = imu.getIMUData()
            fusion_pose = data["fusionPose"]
            data = {"r": math.degrees(fusion_pose[0]), "p": math.degrees(fusion_pose[1]),
                         "y": math.degrees(fusion_pose[2]), "t": time.time()}
            output_file = open("/tmp/imu", "w")
            output_file.write(json.dumps(data) + "\n")
            output_file.close()
            time.sleep(poll_interval / 1000.0) #ms to seconds
        else:
            time.sleep(0.1)

if __name__ == "__main__":
    main()
