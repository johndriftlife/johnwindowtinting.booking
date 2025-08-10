export const db = {
  bookings: [],
  shades: {
    carbon: [{shade:'50%', available:true},{shade:'35%', available:true},{shade:'20%', available:true},{shade:'5%', available:true},{shade:'1%', available:true}],
    ceramic:[{shade:'20%', available:true},{shade:'5%', available:true}]
  },
  slots: [
    { weekday:2, start_time:'14:00', enabled:1 },
    { weekday:3, start_time:'14:00', enabled:1 },
    { weekday:4, start_time:'14:00', enabled:1 },
    { weekday:5, start_time:'14:00', enabled:1 },
    { weekday:6, start_time:'09:00', enabled:1 },
    { weekday:6, start_time:'11:00', enabled:1 },
    { weekday:6, start_time:'14:00', enabled:1 },
    { weekday:0, start_time:'10:00', enabled:1 }
  ]
}
