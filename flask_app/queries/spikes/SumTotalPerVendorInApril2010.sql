SELECT FARE.VENDOR AS Unternehmen, COUNT(FARE.TOTAL) 
FROM NYCCAB.FARE_DOUBLE AS FARE
WHERE FARE.DRIVER > 10 AND FARE.PICKUP_TIME BETWEEN '2010-4-1' AND '2010-4-30'
GROUP BY FARE.VENDOR