Imports System.Data.SqlClient

Public Class frmRptRequests

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Close()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim dap As New SqlDataAdapter("Select * From RequestBill " & _
                                          "Where ReqDate>N'" & Me.DateTimePicker1.Value.ToShortDateString & _
                                          " 00:00:01' and ReqDate<N'" & Me.DateTimePicker2.Value.ToShortDateString & _
                                          " 23:23:59' order by TransNO", cnn)
            Dim das As New DataSet
            das.Clear()

            cnn.Open()
            dap.Fill(das, "RequestBill")
            cnn.Close()

            Dim rpt As New RequestBillList
            rpt.SetDataSource(das)
            RptViewer.CrystalReportViewer1.ReportSource = rpt
            RptViewer.CrystalReportViewer1.RefreshReport()
            RptViewer.CrystalReportViewer1.Zoom(60)
            RptViewer.ShowDialog()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim dap As New SqlDataAdapter("Select * From RequestBill " & _
                                          "Where ReqDate>N'" & Me.DateTimePicker1.Value.ToShortDateString & _
                                          " 00:00:01' and ReqDate<N'" & Me.DateTimePicker2.Value.ToShortDateString & _
                                          " 23:23:59' and TransNo in (Select ReqNo from Transactions " & _
                                          "where TransDate>N'" & Me.DateTimePicker1.Value.ToShortDateString & _
                                          " 00:00:01' and TransDate<N'" & Me.DateTimePicker2.Value.ToShortDateString & _
                                          " 23:23:59' ) order by TransNO", cnn)
            Dim das As New DataSet
            das.Clear()

            cnn.Open()
            dap.Fill(das, "RequestBill")
            cnn.Close()

            Dim rpt As New RequestBillList
            rpt.SetDataSource(das)
            RptViewer.CrystalReportViewer1.ReportSource = rpt
            RptViewer.CrystalReportViewer1.RefreshReport()
            RptViewer.CrystalReportViewer1.Zoom(60)
            RptViewer.ShowDialog()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub
End Class