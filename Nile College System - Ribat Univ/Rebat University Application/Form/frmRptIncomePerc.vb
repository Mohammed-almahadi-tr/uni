Imports System.Data.SqlClient

Public Class frmRptIncomePerc

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Close()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Try
            Me.Cursor = Cursors.WaitCursor
            
            Dim dap As New SqlDataAdapter("Select N'" & Me.DateTimePicker1.Value.ToString & "' Descr,N'" & _
                                          Me.DateTimePicker2.Value.ToString & "' AcdYear,Acc2,Acc3," & _
                                          "Sum(TotalValueIn)-Sum(TotalValueOut) TotalValueIn From Transactions " & _
                                          "Where Acc1=N'الإيرادات' and TransDate>N'" & Me.DateTimePicker1.Value.ToShortDateString & _
                                          " 00:00:01' and TransDate<N'" & Me.DateTimePicker2.Value.ToShortDateString & _
                                          " 23:59:59'  Group By Acc2,Acc3", cnn)


            'Dim dap As New SqlDataAdapter("Select N'" & Me.DateTimePicker1.Value.ToString & "'  Descr," & _
            '                               " N'" & Me.DateTimePicker2.Value.ToString & "'  AcdYear, Acc2, Acc3," & _
            '                               " SUM(TotalValueIn) - SUM(TotalValueOut)  TotalValueIn FROM Transactions " & vbCrLf & _
            '                               " WHERE (Acc1 = N'الإيرادات') AND (TransDate > N'" & Me.DateTimePicker1.Value.ToShortDateString & _
            '                               " 00:00:01') AND (TransDate < N'" & Me.DateTimePicker2.Value.ToShortDateString & " 23:59:59')" & _
            '                               " AND (Descr <> 'الرسوم الدراسية')" & vbCrLf & _
            '                               "GROUP BY Acc2, Acc3 " & vbCrLf & _
            '                               " UNION " & _
            '                               "Select N'" & Me.DateTimePicker1.Value.ToString & "'  Descr," & _
            '                               " N'" & Me.DateTimePicker2.Value.ToString & "'  AcdYear, 'الرسوم الدراسية بكلاريوس' as Acc2, Acc3," & _
            '                               " SUM(TotalValueIn) - SUM(TotalValueOut) AS TotalValueIn FROM  Transactions AS Transactions_1 " & vbCrLf & _
            '                               "WHERE     (Acc1 = N'الإيرادات') AND (TransDate > N'" & _
            '                                Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01')" & _
            '                               " AND (TransDate < N'" & Me.DateTimePicker2.Value.ToShortDateString & _
            '                               " 23:59:59') AND (Descr = 'الرسوم الدراسية') AND (College NOT LIKE '%دبلوم%') " & vbCrLf & _
            '                               "GROUP BY Acc2, Acc3 " & vbCrLf & _
            '                               "UNION " & _
            '                               "Select N'" & Me.DateTimePicker1.Value.ToString & "'  Descr," & _
            '                               " N'" & Me.DateTimePicker2.Value.ToString & "'  AcdYear," & _
            '                               " 'الرسوم الدراسية دبلوم' AS Acc2, Acc3, SUM(TotalValueIn) - SUM(TotalValueOut) " & _
            '                               "  TotalValueIn FROM Transactions AS Transactions_1  " & vbCrLf & _
            '                               "WHERE     (Acc1 = N'الإيرادات') AND (TransDate > N'" & _
            '                               Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01') AND " & _
            '                               "(TransDate < N'" & Me.DateTimePicker2.Value.ToShortDateString & _
            '                               " 23:59:59') AND (Descr = 'الرسوم الدراسية') AND (College LIKE '%دبلوم%')" & vbCrLf & _
            '                               " GROUP BY Acc2, Acc3", cnn)
            Dim das As New DataSet
            das.Clear()

            'cnn.Open()
            dap.Fill(das, "Transactions")
            'cnn.Close()

            Dim rpt As New IncomePerc
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