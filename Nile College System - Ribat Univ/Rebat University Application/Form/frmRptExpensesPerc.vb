Imports System.Data.SqlClient

Public Class frmRptExpensesPerc

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Close()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim dap As New SqlDataAdapter("Select N'" & Me.DateTimePicker1.Value.ToString & "' Descr,N'" & _
                                          Me.DateTimePicker2.Value.ToString & "' AcdYear,Acc2,Acc3," & _
                                          "Sum(TotalValueOut)-Sum(TotalValueIn) TotalValueIn From Transactions " & _
                                          "Where Acc1=N'المنصرفات' and TransDate>N'" & Me.DateTimePicker1.Value.ToShortDateString & _
                                          " 00:00:01' and TransDate<N'" & Me.DateTimePicker2.Value.ToShortDateString & _
                                          " 23:23:59'  Group By Acc2,Acc3", cnn)
            Dim das As New DataSet
            das.Clear()

            cnn.Open()
            dap.Fill(das, "Transactions")
            cnn.Close()

            Dim rpt As New ExpensesPerc
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